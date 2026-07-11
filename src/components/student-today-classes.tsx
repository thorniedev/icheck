"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarClockIcon, DoorOpenIcon, LoaderCircleIcon } from "lucide-react";
import { api } from "@/lib/api/api-client";
import { getErrorMessage } from "@/lib/api/error-utils";
import { useUser } from "@/components/user-provider";
import { useGetUserEnrollmentsQuery } from "@/store/api/userApi";

interface TodaySession {
  classroomId: number;
  classroomName: string;
  sessionId: number | null;
  startTime: string | null;
  endTime: string | null;
  status: string | null;
  myStatus: string | null;        // this student's attendance status, if any
  checkedOut: boolean;
}

function fmt12(raw?: string | null): string {
  if (!raw) return "—";
  const [hh, mm] = raw.split(":");
  const h = Number(hh);
  if (Number.isNaN(h)) return raw;
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${mm ?? "00"} ${period}`;
}

function statusBadgeClass(status?: string | null): string {
  switch ((status ?? "").toUpperCase()) {
    case "PRESENT":  return "bg-green-100 text-green-700";
    case "LATE":     return "bg-amber-100 text-amber-700";
    case "LATE_OUT": return "bg-orange-100 text-orange-700";
    case "ABSENT":   return "bg-red-100 text-red-700";
    default:         return "bg-muted text-muted-foreground";
  }
}

/**
 * Shows the student's classes that have a session TODAY — handles the case
 * where two classes run concurrently (the student sees both, each with its own
 * status + check-out). Check-out posts to /attendances/check-out; if they
 * leave before the session ends without an approved permission, the backend
 * flags LATE_OUT at session close.
 */
export function StudentTodayClasses() {
  const user = useUser();
  const userId = user?.id ?? "";
  const { data: enrollments = [] } = useGetUserEnrollmentsQuery(userId, { skip: !userId });

  const [rows, setRows] = useState<TodaySession[]>([]);
  const [loading, setLoading] = useState(false);
  const [checkingOut, setCheckingOut] = useState<number | null>(null);

  // Re-fetch every 25s so an admin-approved late/permission request shows up on
  // the student's own profile without a manual refresh.
  const [refreshTick, setRefreshTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setRefreshTick((n) => n + 1), 25_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!userId || enrollments.length === 0) return;
    let cancelled = false;

    (async () => {
      // Only show the spinner on the first load — silent on the 25s polls.
      if (refreshTick === 0) setLoading(true);
      const today = new Date().toISOString().slice(0, 10);
      const out: TodaySession[] = [];

      for (const e of enrollments) {
        const classroomId = Number(e.classroomId ?? e.id);
        if (!classroomId) continue;
        const className = e.className ?? e.classroomName ?? e.classCode ?? `Class ${classroomId}`;
        try {
          // ensure-today (idempotent) then read today's session for this class.
          await api.post(`/sessions/classrooms/${classroomId}/ensure-today`, {}).catch(() => {});
          const raw = await api.get(`/sessions/classrooms/${classroomId}?from=${today}&to=${today}&size=5`);
          const sessionPayload = (raw as { payload?: { content?: Array<Record<string, unknown>> } | Array<Record<string, unknown>> } | null)?.payload;
          const sessions: Array<Record<string, unknown>> = Array.isArray(sessionPayload)
            ? sessionPayload
            : (sessionPayload?.content ?? []);

          if (sessions.length === 0) continue;

          for (const s of sessions) {
            const sessionId = Number(s.id) || null;
            // Fetch this student's attendance row for the session (if any).
            let myStatus: string | null = null;
            let checkedOut = false;
            if (sessionId) {
              try {
                const att = await api.get(`/attendances/sessions/${sessionId}?size=500`);
                const attPayload = (att as { payload?: { content?: Array<Record<string, unknown>> } | Array<Record<string, unknown>> } | null)?.payload;
                const attRows: Array<Record<string, unknown>> = Array.isArray(attPayload)
                  ? attPayload
                  : (attPayload?.content ?? []);
                const mine = attRows.find((r) => {
                  const sid = (r.student as { id?: number } | undefined)?.id ?? r.studentId;
                  return String(sid) === String(userId);
                });
                if (mine) {
                  myStatus = (mine.status as string) ?? null;
                  checkedOut = mine.checkOutTime != null;
                }
              } catch { /* ignore — no attendance yet */ }
            }
            out.push({
              classroomId,
              classroomName: className,
              sessionId,
              startTime: (s.startTime as string) ?? null,
              endTime: (s.endTime as string) ?? null,
              status: (s.status as string) ?? null,
              myStatus,
              checkedOut,
            });
          }
        } catch { /* skip this class on error */ }
      }

      if (!cancelled) {
        // Sort by start time so concurrent classes line up.
        out.sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? ""));
        setRows(out);
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [userId, enrollments, refreshTick]);

  async function handleCheckOut(row: TodaySession) {
    if (!row.sessionId || !userId) return;
    setCheckingOut(row.sessionId);
    try {
      await api.post(`/attendances/check-out`, {
        studentId: Number(userId),
        sessionId: row.sessionId,
      });
      toast.success("Checked out. If you left before class ended without permission, it may be marked Late Out.");
      setRows((prev) =>
        prev.map((r) => (r.sessionId === row.sessionId ? { ...r, checkedOut: true } : r)),
      );
    } catch (e) {
      toast.error(getErrorMessage(e, "Could not check out."));
    } finally {
      setCheckingOut(null);
    }
  }

  if (!userId) return null;

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <CalendarClockIcon className="size-5 text-primary" />
        <h2 className="font-semibold text-foreground">Today&apos;s Classes</h2>
        {rows.length > 1 && (
          <Badge variant="outline" className="ml-1 text-[11px]">
            {rows.length} concurrent
          </Badge>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <LoaderCircleIcon className="size-4 animate-spin" /> Loading today&apos;s sessions…
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No class scheduled for today.</p>
      ) : (
        <div className="grid gap-3">
          {rows.map((r) => (
            <div
              key={`${r.classroomId}-${r.sessionId}`}
              className="flex items-center justify-between gap-3 rounded-xl border border-border/60 px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{r.classroomName}</p>
                <p className="text-[11px] text-muted-foreground/70">
                  {fmt12(r.startTime)} – {fmt12(r.endTime)} · {r.status?.toLowerCase() ?? "—"}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge className={statusBadgeClass(r.myStatus)}>
                  {r.myStatus?.toLowerCase().replace("_", " ") ?? "pending"}
                </Badge>
                {/* Check-out only meaningful when the student is recorded present
                    in an active session and hasn't already checked out. */}
                {r.status === "ACTIVE" && r.myStatus && !r.checkedOut && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1.5"
                    onClick={() => handleCheckOut(r)}
                    disabled={checkingOut === r.sessionId}
                  >
                    {checkingOut === r.sessionId
                      ? <LoaderCircleIcon className="size-3.5 animate-spin" />
                      : <DoorOpenIcon className="size-3.5" />}
                    Leave
                  </Button>
                )}
                {r.checkedOut && (
                  <span className="text-[11px] text-muted-foreground/70">checked out</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
