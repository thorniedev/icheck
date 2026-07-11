"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@/components/user-provider";
import { CheckCircleIcon, AlertCircleIcon, LoaderCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/common/logo";
import { useLiveLocation } from "@/lib/utils/geolocation";
import { getCheckInErrorMessage } from '@/lib/utils/check-in-error';

type State = "loading" | "success" | "error" | "noToken" | "needReason";

const FETCH_TIMEOUT_MS = 12_000;

/** Remember the current scan URL, then bounce to login — so a student whose
 *  session expired mid check-in lands right back here after signing in. */
function redirectToLoginWithReturn() {
  const here = window.location.pathname + window.location.search;
  document.cookie = `post_login_redirect=${encodeURIComponent(here)}; path=/; max-age=600; samesite=lax`;
  window.location.assign("/api/auth/login");
}

export default function CheckInPage() {
  return (
    <Suspense>
      <CheckInContent />
    </Suspense>
  );
}

function CheckInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  // Static (classroom-printed) QR redirects with ?kind=static. A static scan is
  // a fast scan like the dynamic QR: on time it records immediately with no
  // reason. Only if the backend rejects it as a LATE scan ("reason is required")
  // do we prompt the student for a reason.
  const kindParam = searchParams.get("kind");
  const isStatic = kindParam === "static";
  const user = useUser();
  // Live location — pre-warms a GPS watch on mount so a fresh fix is ready by
  // the time we auto-submit (and on every retry), instead of a stale/null one.
  const { getFreshCoords } = useLiveLocation();
  const [state, setState] = useState<State>("loading");
  const [message, setMessage] = useState("");
  const [reason, setReason] = useState("");
  const didSubmit = useRef(false);
  // The QR's kind (static vs dynamic), seeded from the URL. Some printed static
  // QRs link to /check-in?token=… WITHOUT &kind=static, so we may correct this
  // at runtime: if the guessed endpoint is rejected we flip once and retry.
  const kindRef = useRef<"static" | "dynamic">(isStatic ? "static" : "dynamic");
  const flippedRef = useRef(false);
  const viewState: State = token ? state : "noToken";

  const doCheckIn = async (qrToken: string, reasonOverride?: string) => {
    if (didSubmit.current) return;
    didSubmit.current = true;
    setState("loading");

    // Get a fresh, live GPS fix (no stale cache). This is the step that used to
    // fail silently and force a refresh — now we wait for a real fix and, if we
    // genuinely can't get one, stop with a clear message instead of posting null.
    const coords = await getFreshCoords();
    if (!coords) {
      didSubmit.current = false; // allow retry
      setState("error");
      setMessage(
        "We couldn't read your location. Turn on GPS / Location for this site, then tap Try Again."
      );
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      // The proxy reads the HttpOnly device cookie server-side, so we never
      // expose or send the device id from client JS.
      const res = await fetch("/api/attendance/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          qrToken,
          kind: kindRef.current,
          reason: reasonOverride ?? (kindRef.current === "static" ? reason : undefined),
          latitude: coords.latitude,
          longitude: coords.longitude,
        }),
      });
      clearTimeout(timeout);

      const json = await res.json();

      if (res.ok) {
        const usedReason = Boolean((reasonOverride ?? reason)?.trim());
        setState("success");
        setMessage(
          usedReason
            ? "Late check-in recorded — your reason was submitted for review."
            : `Attendance recorded for ${user?.name ?? "you"}.`
        );
      } else {
        // Session expired / not logged in → send the student straight to login,
        // remembering this scan URL so they land right back here (better UX than
        // a dead-end "session expired" error).
        if (res.status === 401 || res.status === 403) {
          setState("loading");
          setMessage("Redirecting you to log in…");
          redirectToLoginWithReturn();
          return;
        }

        // Surface the REAL reason — read every field the backend / proxy might
        // use (payload.message, message, error). Only fall back to the generic
        // hint when the response truly carries nothing.
        const errMsg = getCheckInErrorMessage(
          json,
          "Check-in failed. Please try again, or ask your teacher to re-open the QR."
        );

        // QR-type mismatch: we guessed the wrong endpoint (e.g. a printed static
        // QR whose link lacks &kind=static, so we tried "dynamic"). Flip to the
        // other endpoint once and retry transparently — the student sees nothing.
        if (/only accepts (dynamic|static) qr codes/i.test(errMsg) && !flippedRef.current) {
          flippedRef.current = true;
          kindRef.current = kindRef.current === "static" ? "dynamic" : "static";
          didSubmit.current = false;
          await doCheckIn(qrToken, reasonOverride);
          return;
        }

        // Backend signal that a reason is required (static QR, missing reason).
        if (/reason is required/i.test(errMsg)) {
          setState("needReason");
          setMessage("This is a static (classroom) QR — please give a short reason for your late scan.");
          didSubmit.current = false;
          return;
        }
        setState("error");
        setMessage(errMsg);
      }
    } catch (err: unknown) {
      clearTimeout(timeout);
      didSubmit.current = false; // allow retry
      const isAbort = err instanceof Error && err.name === "AbortError";
      setState("error");
      setMessage(
        isAbort
          ? "Request timed out. Check your connection and try again."
          : "Network error. Make sure you are connected."
      );
    }
  };

  // Both static and dynamic scans auto-attempt the check-in on load. A static
  // on-time scan succeeds immediately (no reason); a static LATE scan comes back
  // with "reason is required", which flips us to the needReason form below.
  useEffect(() => {
    if (!token) return;
    const timer = window.setTimeout(() => {
      doCheckIn(token);
    }, 0);
    return () => window.clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="min-h-screen bg-muted/50 flex items-center justify-center p-6">
      <div className="bg-card rounded-3xl shadow-lg p-8 w-full max-w-sm text-center">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <Logo size={36} />
          <span className="text-xl font-bold tracking-tight">i-Check</span>
        </div>

        {viewState === "loading" && (
          <div className="flex flex-col items-center gap-4 py-6">
            <LoaderCircleIcon className="size-12 text-primary animate-spin" />
            <p className="text-muted-foreground font-medium">Recording attendance…</p>
            <p className="text-xs text-muted-foreground/70">This may take a few seconds</p>
          </div>
        )}

        {viewState === "success" && (
          <div className="flex flex-col items-center gap-4 py-4">
            <CheckCircleIcon className="size-16 text-green-500" />
            <h2 className="text-xl font-bold text-foreground">Check-in Successful!</h2>
            <p className="text-muted-foreground text-sm">{message}</p>
            <Button
              className="mt-2 w-full bg-primary hover:bg-primary/90"
              onClick={() => router.push("/student")}
            >
              Go to My Attendance
            </Button>
          </div>
        )}

        {viewState === "needReason" && (
          <div className="flex flex-col items-center gap-4 py-4">
            <AlertCircleIcon className="size-12 text-amber-500" />
            <h2 className="text-xl font-bold text-foreground">Reason required</h2>
            <p className="text-muted-foreground text-sm">{message}</p>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Traffic delay, ran late from lab…"
              className="w-full"
              autoFocus
            />
            <Button
              className="mt-2 w-full bg-primary hover:bg-primary/90"
              disabled={reason.trim().length < 3}
              onClick={() => {
                if (!token) return;
                didSubmit.current = false;
                doCheckIn(token, reason.trim());
              }}
            >
              Submit reason &amp; check in
            </Button>
            <Button
              variant="ghost"
              className="w-full text-muted-foreground/70"
              onClick={() => router.push("/student")}
            >
              Cancel
            </Button>
          </div>
        )}

        {viewState === "error" && (
          <div className="flex flex-col items-center gap-4 py-4">
            <AlertCircleIcon className="size-16 text-red-400" />
            <h2 className="text-xl font-bold text-foreground">Check-in Failed</h2>
            <p className="text-muted-foreground text-sm">{message}</p>
            <Button
              className="mt-2 w-full bg-primary hover:bg-primary/90"
              onClick={() => {
                if (!token) return;
                didSubmit.current = false;
                doCheckIn(token);
              }}
            >
              Try Again
            </Button>
            <Button
              variant="ghost"
              className="w-full text-muted-foreground/70"
              onClick={() => router.push("/student")}
            >
              Back to Home
            </Button>
          </div>
        )}

        {viewState === "noToken" && (
          <div className="flex flex-col items-center gap-4 py-4">
            <AlertCircleIcon className="size-16 text-yellow-400" />
            <h2 className="text-xl font-bold text-foreground">Invalid QR Code</h2>
            <p className="text-muted-foreground text-sm">This QR code is not valid. Ask your teacher to show a new one.</p>
            <Button
              className="mt-2 w-full bg-primary"
              onClick={() => router.push("/student")}
            >
              Back to Home
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
