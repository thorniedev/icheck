import { schoolNowMinutes, timeToMinutes } from "@/lib/utils/school-time";

/**
 * Pure session-window helpers — no server-only imports (safe in client
 * components). Kept separate from session-helpers.ts, which pulls in
 * backendFetch → next/headers and therefore can't be imported client-side.
 */

export function isOpenableStatus(status?: string | null) {
  return status === "UPCOMING" || status === "SCHEDULED";
}

/** Minimal shape needed to decide whether a teacher can open the QR. */
export interface StartableSession {
  status?: string | null;
  startTime?: string | null;
  earlyCheckinMinutes?: number | null;
  lateThresholdMinutes?: number | null;
}

/**
 * A teacher can open the session only from its SCHEDULED start time until
 * `lateThresholdMinutes` after it — never before the start time. Past the late
 * threshold the QR can no longer be opened (use the Amendment form). The late
 * bound comes from the session (system setting), not a hardcoded value.
 *
 * Note: this is the TEACHER gate. Students may still scan the static classroom
 * QR up to `earlyCheckinMinutes` before the start (handled server-side).
 */
export function isTeacherStartableSession(session: StartableSession) {
  if (session.status === "ACTIVE") return true;
  if (!isOpenableStatus(session.status)) return false;
  const start = timeToMinutes(session.startTime);
  if (start == null) return false;
  const now = schoolNowMinutes();
  const late = session.lateThresholdMinutes ?? 10;
  return now >= start && now <= start + late;
}
