"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { AlertCircleIcon, LoaderCircleIcon, RefreshCwIcon, ClipboardPenIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useEnsureTodaySessionsForClassroomMutation,
  useGetTodaySessionsForClassroomQuery,
  useOpenSessionMutation,
  useTeacherCheckInSessionMutation,
  useGenerateDynamicQrMutation,
  type SessionDto,
} from "@/store/api/qrApi";
import { useUser } from "@/components/user-provider";
import { isTeacherStartableSession } from "@/lib/auth/session-window";

const QR_LOGO_URL =
  "https://res.cloudinary.com/dsmqsivcj/image/upload/v1780286128/c4lgj7uipplt47mergga.png";
// Only a safety net if the backend ever omits expireTime — the real countdown
// always comes from the token's expireTime, which the backend derives from the
// `qr_window_minutes` system setting (5 min). Never a 30s "refresh".
const FALLBACK_QR_SECONDS = 300;

function isOpenable(status: SessionDto["status"]) {
  return status === "UPCOMING" || status === "SCHEDULED";
}

function formatRemaining(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const secondsLeft = seconds % 60;
  return `${minutes}:${secondsLeft.toString().padStart(2, "0")}`;
}

interface ApiErrorShape {
  data?: { payload?: { message?: string }; message?: string };
  status?: number | string;
}

function extractMessage(err: unknown, fallback: string): string {
  const e = err as ApiErrorShape;
  return e?.data?.payload?.message ?? e?.data?.message ?? fallback;
}

type TakeAttendanceQrCodeProps = {
  /** Classroom this QR belongs to — used to find today's session. */
  classroomId: number;
  closeHref?: string;
  qrSize?: string;
  logoSize?: number;
};

export function TakeAttendanceQrCode({
  classroomId,
  closeHref,
  qrSize = "min(86vmin, calc(100vw - 4rem), calc(100vh - 8rem))",
  logoSize = 220,
}: TakeAttendanceQrCodeProps) {
  const router = useRouter();
  const user = useUser();

  // Make sure today's session row exists (the 06:00 generator may have missed
  // schedules created after it ran). Idempotent — runs once on mount and
  // invalidates Session tags so the query below refetches with the new row.
  const [ensureToday, { isLoading: ensuringToday }] =
    useEnsureTodaySessionsForClassroomMutation();
  const ensuredRef = useRef(false);
  const [ensureDone, setEnsureDone] = useState(false);
  const [ensuredSessions, setEnsuredSessions] = useState<SessionDto[] | null>(null);
  useEffect(() => {
    if (ensuredRef.current) return;
    ensuredRef.current = true;
    setEnsureDone(false);
    ensureToday(classroomId)
      .unwrap()
      .then((result) => {
        setEnsuredSessions(result.sessions);
        setError("");
      })
      .catch((e) => {
        setError(extractMessage(e, "Could not create today's session from the class schedule."));
      })
      .finally(() => setEnsureDone(true));
  }, [ensureToday, classroomId]);

  const {
    data: sessions,
    isFetching: loadingSessions,
    isError: sessionsErrored,
  } = useGetTodaySessionsForClassroomQuery({ classroomId });
  const [openSession] = useOpenSessionMutation();
  const [teacherCheckInSession] = useTeacherCheckInSessionMutation();
  const [generateDynamicQr] = useGenerateDynamicQrMutation();

  const [session, setSession] = useState<SessionDto | null>(null);
  const [qr, setQr] = useState<{ codeValue: string; expireTime: string | null } | null>(null);
  const [remaining, setRemaining] = useState(FALLBACK_QR_SECONDS);
  const [duration, setDuration] = useState(FALLBACK_QR_SECONDS);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const initRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isExpired = remaining <= 0;
  const isUrgent = remaining <= Math.min(8, Math.ceil(duration / 3));

  const generate = useCallback(
    async (sessionId: number) => {
      setLoading(true);
      try {
        const result = await generateDynamicQr(sessionId).unwrap();
        setQr({ codeValue: result.codeValue, expireTime: result.expireTime });
        setError("");
        const secs = result.expireTime
          ? Math.max(1, Math.round((new Date(result.expireTime).getTime() - Date.now()) / 1000))
          : FALLBACK_QR_SECONDS;
        setRemaining(secs);
        setDuration(secs);
      } catch (e) {
        setError(extractMessage(e, "Failed to generate QR code. Make sure the session is active."));
      } finally {
        setLoading(false);
      }
    },
    [generateDynamicQr]
  );

  // Find (and open, if needed) today's session for this classroom, then generate the first QR.
  useEffect(() => {
    if (initRef.current) return;
    // Wait for the on-demand session generator to finish — otherwise the first
    // pass through this effect can see an empty list and short-circuit before
    // the row materialises.
    if (!ensureDone || ensuringToday) return;
    const availableSessions = ensuredSessions?.length ? ensuredSessions : sessions;
    if (!availableSessions) return;
    if (!user) return;
    initRef.current = true;

    (async () => {
      const target =
        availableSessions.find((s) => s.status === "ACTIVE") ??
        availableSessions.find((s) => isOpenable(s.status));

      if (!target) {
        setError("No session is scheduled for this class today.");
        return;
      }

      setSession(target);

      if (isOpenable(target.status)) {
        // Enforce the start window even on direct navigation: past the late
        // threshold the QR can no longer be opened — use the Amendment form.
        if (!isTeacherStartableSession(target)) {
          setError(
            "The start window has closed for this session. Use the Amendment form to record attendance."
          );
          return;
        }
        try {
          if (user?.role === "ADMIN") {
            await openSession(target.id).unwrap();
          } else if (user?.id) {
            await teacherCheckInSession({ sessionId: target.id, teacherId: user.id }).unwrap();
          } else {
            throw new Error("Could not identify the current teacher.");
          }
        } catch (e) {
          setError(e instanceof Error ? e.message : extractMessage(e, "Could not start the session yet — check the session schedule."));
          return;
        }
      }

      await generate(target.id);
    })();
  }, [sessions, ensuredSessions, ensureDone, ensuringToday, openSession, teacherCheckInSession, generate, user?.id, user?.role]);

  // Countdown ticker — the QR is a SINGLE token valid for the whole window
  // (no rotation). When it reaches 0 the window has closed; we stop at 0 and do
  // NOT regenerate (the backend also refuses to reopen past the window).
  useEffect(() => {
    if (!session || !qr) return;
    timerRef.current = setInterval(() => {
      setRemaining((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [session, qr]);

  const checkInUrl =
    qr && typeof window !== "undefined"
      ? `${window.location.origin}/check-in?token=${qr.codeValue}`
      : "";

  // After the 5-minute window the only path is the Amendment form. Detect the
  // backend's "window closed" / "start window closed" errors so we can show the
  // Amendment button instead of a pointless Retry.
  const amendmentHref = `/dashboard/classrooms/${classroomId}/take-attendance/checked_attendance`;
  const windowClosed = /window has closed|start window has closed|window closed|amendment/i.test(error);
  const AmendmentButton = (
    <Button onClick={() => router.push(amendmentHref)} className="gap-2 bg-primary hover:bg-primary/90">
      <ClipboardPenIcon className="size-4" />
      Submit Amendment
    </Button>
  );

  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-center gap-5">
      {session && (
        <div className="text-center">
          <p className="text-sm font-medium text-muted-foreground">{session.subjectName || "Attendance Session"}</p>
          <p className="text-xs text-muted-foreground/70">
            {session.classroomName} &nbsp;·&nbsp; {session.startTime?.slice(0, 5)}–
            {session.endTime?.slice(0, 5)}
          </p>
        </div>
      )}

      {error ? (
        <div className="flex flex-col items-center gap-3 text-center">
          <AlertCircleIcon className="size-12 text-red-400" />
          <p className="max-w-xs text-sm text-muted-foreground">{error}</p>
          {/* Window closed → Amendment is the only path; otherwise allow Retry. */}
          {windowClosed
            ? AmendmentButton
            : session && (
                <Button onClick={() => generate(session.id)} disabled={loading} className="gap-2">
                  {loading ? <LoaderCircleIcon className="size-4 animate-spin" /> : <RefreshCwIcon className="size-4" />}
                  Retry
                </Button>
              )}
        </div>
      ) : isExpired && qr ? (
        // 5-minute scan window closed — close the QR and offer the Amendment form.
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="rounded-2xl bg-red-50 px-8 py-4 text-red-600 shadow-sm dark:bg-red-950/40">
            <p className="text-sm font-medium uppercase tracking-wide opacity-70">QR expired</p>
            <p className="font-mono text-5xl font-semibold leading-tight tabular-nums">0:00</p>
          </div>
          <p className="max-w-xs text-sm text-muted-foreground">
            The 5-minute scan window has closed. Record any remaining students with an amendment.
          </p>
          {AmendmentButton}
        </div>
      ) : (
        <>
          <div
            className={`rounded-2xl px-8 pt-3 text-center shadow-sm ${
              isExpired
                ? "bg-red-50 text-red-600 dark:bg-red-950/40"
                : isUrgent
                  ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                  : "bg-background/90 text-foreground"
            }`}
          >
            <p className="text-sm font-medium uppercase tracking-wide opacity-70">
              {isExpired ? "QR expired" : "QR expires in"}
            </p>
            <p className="font-mono text-5xl font-semibold leading-tight tabular-nums">
              {/* Show the timer only once the real token (5-min expiry) is
                  loaded — avoids flashing the fallback value on open. */}
              {qr ? formatRemaining(remaining) : "—:—"}
            </p>
          </div>

          <div className="aspect-square" style={{ width: qrSize, height: qrSize }}>
            {qr ? (
              <QRCodeCanvas
                value={checkInUrl}
                size={1024}
                className="block size-full"
                style={{ width: "100%", height: "100%" }}
                level="H"
                includeMargin={true}
                imageSettings={{
                  src: QR_LOGO_URL,
                  x: undefined,
                  y: undefined,
                  height: logoSize,
                  width: logoSize,
                  excavate: true,
                }}
              />
            ) : (
              <div className="flex size-full items-center justify-center rounded-xl bg-muted">
                <LoaderCircleIcon className="size-10 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>

          <p className="text-sm text-muted-foreground/70">
            {isExpired
              ? "The attendance window has closed. Use the Amendment form for any remaining students."
              : ensuringToday
                ? "Preparing today's session…"
                : loadingSessions
                  ? "Loading session…"
                  : sessionsErrored
                    ? "Could not load today's sessions."
                    : "Students scan this QR with i-Check to mark attendance"}
          </p>
        </>
      )}

      {closeHref && (
        <Button
          variant="outline"
          className="mt-2 w-full max-w-xs"
          onClick={() => router.replace(closeHref)}
        >
          Done
        </Button>
      )}
    </div>
  );
}
