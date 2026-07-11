import { backendFetch } from "@/lib/api-fetch";
import { schoolNowMinutes, schoolToday, timeToMinutes, todayIso } from "@/lib/utils/school-time";
import { fetchTeacherClassrooms, type ClassroomSummary } from "@/lib/utils/classroom-helpers";
import { isOpenableStatus, isTeacherStartableSession } from "@/lib/auth/session-window";

export { isTeacherStartableSession } from "@/lib/auth/session-window";

export interface SessionSummary {
  id: number | null;
  classroomId?: number | null;
  classroomName?: string | null;
  subjectName?: string | null;
  teacherName?: string | null;
  sessionDate: string | null;
  startTime: string | null;
  endTime: string | null;
  status: string | null;
  substituteTeacherId?: number | null;
  substituteTeacherName?: string | null;
  substituteReason?: string | null;
  earlyCheckinMinutes?: number | null;
  lateThresholdMinutes?: number | null;
  actualStartTime?: string | null;
  actualEndTime?: string | null;
  teacherEditDeadlineMinutes?: number | null;
}

interface ScheduleSummary {
  id: number;
  classId?: number | null;
  className: string;
  subjectName?: string | null;
  teacherName?: string | null;
  dayOfWeek: string;
  startTime: string | null;
  endTime: string | null;
  status: boolean;
  attendanceRequired?: boolean | null;
}

export interface TeacherClassroomView extends ClassroomSummary {
  activeSession?: SessionSummary | null;
}

function pageContent<T>(json: unknown): T[] {
  const payload = (json as { payload?: { content?: T[] } | T[] })?.payload;
  if (Array.isArray(payload)) return payload;
  return payload?.content ?? [];
}

function sessionSort(a: Pick<SessionSummary, "startTime">, b: Pick<SessionSummary, "startTime">) {
  return (a.startTime ?? "").localeCompare(b.startTime ?? "");
}

/**
 * Show on "My Classes" if today's session is still upcoming or live — i.e.
 * ACTIVE or UPCOMING/SCHEDULED. Unlike {@link isTeacherStartableSession} this
 * is NOT gated by the start window, so an UPCOMING class scheduled later today
 * also appears (the class-detail Start button still enforces the time window).
 */
function isTodaySession(session: Pick<SessionSummary, "status">) {
  return session.status === "ACTIVE" || isOpenableStatus(session.status);
}

/** A teacher's schedule that runs TODAY (any time), not yet in the past view. */
function isTodaySchedule(schedule: ScheduleSummary) {
  if (!schedule.status || schedule.attendanceRequired === false) return false;
  const today = schoolToday();
  return schedule.dayOfWeek?.toUpperCase() === today.weekday;
}

function scheduleToSession(schedule: ScheduleSummary): SessionSummary {
  const today = schoolToday();
  return {
    id: null,
    classroomId: schedule.classId ?? null,
    classroomName: schedule.className,
    subjectName: schedule.subjectName ?? null,
    teacherName: schedule.teacherName ?? null,
    sessionDate: today.iso,
    startTime: schedule.startTime,
    endTime: schedule.endTime,
    status: "UPCOMING",
    earlyCheckinMinutes: 10,
    lateThresholdMinutes: 10,
  };
}

export function chooseBestSession(sessions: SessionSummary[]) {
  const sorted = [...sessions].sort(sessionSort);
  return (
    sorted.find((session) => session.status === "ACTIVE") ??
    sorted.find(isTeacherStartableSession) ??
    sorted.find((session) => isOpenableStatus(session.status)) ??
    sorted.find((session) => session.status !== "CANCELLED") ??
    null
  );
}

function localTimeFromDateTime(value?: string | null): string | null {
  if (!value) return null;
  return value.includes("T") ? value.split("T")[1] ?? null : value.split(" ")[1] ?? null;
}

export function isTeacherCorrectionOpen(
  session: SessionSummary | null | undefined,
  fallbackDeadlineMinutes = 30,
  now = new Date(),
) {
  if (!session?.id || !session.sessionDate) return false;
  const currentDate = todayIso(now);
  if (session.sessionDate !== currentDate) return false;

  const deadlineMinutes = session.teacherEditDeadlineMinutes ?? fallbackDeadlineMinutes;
  const endMinutes = session.actualEndTime
    ? timeToMinutes(localTimeFromDateTime(session.actualEndTime))
    : timeToMinutes(session.endTime);

  if (endMinutes == null) return false;
  return schoolNowMinutes(now) <= endMinutes + deadlineMinutes;
}

export async function fetchTodaySessionForClassroom(classroomId: string): Promise<SessionSummary | null> {
  const today = schoolToday();
  try {
    await backendFetch(`/sessions/classrooms/${classroomId}/ensure-today`, { method: "POST" });
    const sessionRes = await backendFetch(
      `/sessions/classrooms/${classroomId}?from=${today.iso}&to=${today.iso}&page=0&size=20`
    );
    if (sessionRes.ok) {
      const sessions = pageContent<SessionSummary>(await sessionRes.json());
      const best = chooseBestSession(sessions);
      if (best) return best;
    }
  } catch {
    // Fall through to the schedule fallback below.
  }

  try {
    const scheduleRes = await backendFetch(`/schedules/classrooms/${classroomId}?size=50`);
    if (!scheduleRes.ok) return null;
    const schedules = pageContent<ScheduleSummary>(await scheduleRes.json())
      .filter((schedule) =>
        schedule.status &&
        schedule.attendanceRequired !== false &&
        schedule.dayOfWeek?.toUpperCase() === today.weekday
      )
      .sort(sessionSort);
    return schedules[0] ? scheduleToSession(schedules[0]) : null;
  } catch {
    return null;
  }
}

export async function fetchTeacherActiveClassrooms(
  teacherId: string,
  allClassrooms?: ClassroomSummary[],
): Promise<TeacherClassroomView[]> {
  const today = schoolToday();
  const classrooms = allClassrooms ?? await fetchTeacherClassrooms(teacherId, 200);
  const classByName = new Map(classrooms.map((classroom) => [classroom.className, classroom]));
  const sessionsByClassName = new Map<string, SessionSummary[]>();
  const activeByName = new Map<string, SessionSummary>();

  try {
    const sessionRes = await backendFetch(
      `/sessions/teachers/${teacherId}?from=${today.iso}&to=${today.iso}&page=0&size=200`
    );
    if (sessionRes.ok) {
      for (const session of pageContent<SessionSummary>(await sessionRes.json())) {
        // Include any of today's sessions that are still upcoming or live
        // (not just the ones inside the start window) so UPCOMING classes
        // appear on My Classes too.
        if (session.classroomName && isTodaySession(session)) {
          const sessions = sessionsByClassName.get(session.classroomName) ?? [];
          sessions.push(session);
          sessionsByClassName.set(session.classroomName, sessions);
        }
      }
      for (const [className, sessions] of sessionsByClassName.entries()) {
        const best = chooseBestSession(sessions);
        if (best) activeByName.set(className, best);
      }
    }
  } catch {
    // Schedule fallback below still gives regular teacher classes.
  }

  try {
    const scheduleRes = await backendFetch(`/schedules/teachers/${teacherId}?size=200`);
    if (scheduleRes.ok) {
      for (const schedule of pageContent<ScheduleSummary>(await scheduleRes.json())) {
        if (schedule.className && isTodaySchedule(schedule) && !activeByName.has(schedule.className)) {
          activeByName.set(schedule.className, scheduleToSession(schedule));
        }
      }
    }
  } catch {
    // Keep any session-backed active classes already found.
  }

  const activeClassrooms: TeacherClassroomView[] = [];
  for (const [className, activeSession] of activeByName.entries()) {
    const classroom = classByName.get(className);
    if (classroom) activeClassrooms.push({ ...classroom, activeSession });
  }
  return activeClassrooms;
}
