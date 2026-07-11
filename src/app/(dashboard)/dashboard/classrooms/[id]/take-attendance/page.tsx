import AttendanceCheckingList from "@/components/table/check_attendance";
import { AmendmentButton } from "@/components/amendment-button";
import { backendFetch } from "@/lib/api-fetch";
import { todayIso, schoolNowMinutes, timeToMinutes } from "@/lib/utils/school-time";
import { AttendanceStatus, type Student } from "@/types/student";
import Link from "next/link";
import { AiOutlineQrcode } from "react-icons/ai";

interface Classroom {
  className: string;
  classCode?: string;
  lab?: string | null;
}

interface SessionLite {
  id: number;
  sessionDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  status?: string | null;
  /** Set when the teacher opens the session — used to clamp the QR window
   *  to 5 minutes from actual start (matches the backend). */
  actualStartTime?: string | null;
  /** Minutes after scheduled start the QR can still be opened (system setting). */
  lateThresholdMinutes?: number | null;
}

async function fetchClassroom(id: string): Promise<Classroom | null> {
  try {
    const res = await backendFetch(`/classrooms/${id}`);
    if (!res.ok) return null;
    const json = await res.json();
    return json?.payload ?? null;
  } catch { return null; }
}

/** Today's session for this classroom (if any). Defaults to the first row the
 *  backend returns — the same window we use for live attendance. The
 *  `ensure-today` call upfront catches the edge case where admin created the
 *  schedule after the daily 06:00 session-generator already ran. */
async function fetchTodaySession(classroomId: string): Promise<SessionLite | null> {
  const today = todayIso();
  try {
    // Idempotent — creates today's row only if missing.
    await backendFetch(`/sessions/classrooms/${classroomId}/ensure-today`, {
      method: "POST",
    });
    const res = await backendFetch(
      `/sessions/classrooms/${classroomId}?from=${today}&to=${today}&size=1`
    );
    if (!res.ok) return null;
    const json = await res.json();
    const content = json?.payload?.content ?? json?.payload ?? [];
    return Array.isArray(content) && content.length > 0 ? content[0] : null;
  } catch { return null; }
}

/** Pulls today's recorded attendance for the session and returns a map
 *  studentId → status. Used to overlay real statuses onto the roster below. */
async function fetchSessionStatusMap(sessionId: number | null): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (!sessionId) return map;
  try {
    const res = await backendFetch(`/attendances/sessions/${sessionId}?size=500`);
    if (!res.ok) return map;
    const json = await res.json();
    const rows = json?.payload?.content ?? json?.payload ?? [];
    if (!Array.isArray(rows)) return map;
    for (const row of rows) {
      const studentId = row?.student?.id ?? row?.studentId;
      const status = row?.status;
      if (studentId != null && typeof status === "string") {
        map.set(String(studentId), status);
      }
    }
  } catch {
    /* swallow — defaults to empty map → everyone shows PENDING */
  }
  return map;
}

async function fetchStudents(id: string, statusMap: Map<string, string>): Promise<Student[]> {
  try {
    const res = await backendFetch(`/classrooms/${id}/students?size=500`);
    if (!res.ok) return [];
    const json = await res.json();
    const rows = json?.payload?.content ?? json?.payload ?? [];
    if (!Array.isArray(rows)) return [];

    return rows.map((student) => {
      const idKey = String(student.id ?? student.studentNo ?? "");
      // Overlay the attendance status if one was recorded today; otherwise the
      // roster row stays PENDING. This is what was previously hardcoded — and
      // why amendment saves never appeared after a refresh.
      const recordedStatus = statusMap.get(idKey);
      return {
        id: idKey,
        name: String(student.name ?? student.fullName ?? student.username ?? "—"),
        gender: String(student.gender ?? "—"),
        phone: String(student.phone ?? student.phoneNumber ?? "—"),
        dateOfBirth: String(student.dateOfBirth ?? student.dob ?? "—"),
        profile: String(student.profileImage ?? student.profile ?? "/file.svg"),
        status: recordedStatus
          ? (recordedStatus.toLowerCase() as AttendanceStatus)
          : AttendanceStatus.PENDING,
      };
    });
  } catch {
    return [];
  }
}

export default async function TakeAttendance({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    // Sequenced because fetchStudents needs the session id to merge statuses.
    const [classroom, session] = await Promise.all([
      fetchClassroom(id),
      fetchTodaySession(id),
    ]);
    const statusMap = await fetchSessionStatusMap(session?.id ?? null);
    const students = await fetchStudents(id, statusMap);
    const female = students.filter(
      (s) => (s.gender ?? "").toUpperCase().startsWith("F")
    ).length;

    return (
        <main className="px-7 py-7">
            <section className="mx-auto mb-2 w-full flex justify-between">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-col">
                  <h1 className="mb-3 text-3xl font-semibold tracking-tight text-black dark:text-white">
                    {classroom?.className ?? "Classroom"}
                  </h1>
                  <h2 className="text-2xl leading-tight text-black dark:text-white">
                    បញ្ជីរាយវត្តមានសិស្ស-Student Attendance List-Today
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground/80">
                    Lab: <span className="text-foreground">{classroom?.lab ?? "—"}</span>
                  </p>
                </div>
        </div>
        {(() => {
          // Two cumulative gates decide whether the QR shortcut is shown:
          //   1. Teacher start grace — past `scheduledStart + 10 min`, the
          //      session can no longer be opened (backend refuses). UPCOMING
          //      sessions past this point should hide QR.
          //   2. Dynamic QR window — once the teacher HAS opened the session,
          //      the backend caps the QR window to 5 min from actualStartTime.
          //      So even an ACTIVE session past that point should hide QR.
          // Either gate failing → amendment is the only path.
          // Minutes-of-day in the SCHOOL timezone — not `new Date("…T…")`,
          // which a server component parses in the host TZ (UTC) and shifts the
          // window by hours.
          const TEACHER_START_GRACE_MINUTES = session?.lateThresholdMinutes ?? 10;
          const QR_WINDOW_MINUTES = 5;
          const nowMin = schoolNowMinutes();
          const startMin = timeToMinutes(session?.startTime ?? null);
          const actualStartMin = session?.actualStartTime
            ? timeToMinutes(session.actualStartTime.split("T")[1] ?? null)
            : null;
          const startCutoffPassed = startMin != null
            ? nowMin > startMin + TEACHER_START_GRACE_MINUTES
            : false;
          // Teacher can't open the session before its scheduled start time.
          const beforeStart = startMin != null ? nowMin < startMin : false;
          const qrCutoffPassed = actualStartMin != null
            ? nowMin > actualStartMin + QR_WINDOW_MINUTES
            : false;
          const qrAvailable =
            (session?.status === "ACTIVE" && !qrCutoffPassed)
            || (session?.status === "UPCOMING" && !startCutoffPassed && !beforeStart);
          // QR XOR Amendment — never both. While the QR window is open the
          // teacher shows the QR; once it closes, only Amendment remains (the
          // way to change any status is to submit a reason).
          return (
            <div className="flex items-center gap-2">
              {qrAvailable ? (
                <Link href={`/dashboard/classrooms/${id}/take-attendance/qr-code`} className="flex items-center gap-2 rounded-md border border-gray-300 bg-white dark:bg-black px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                  <AiOutlineQrcode className="size-18" />
                </Link>
              ) : (
                <AmendmentButton
                  sessionId={session?.id ?? null}
                  students={students.map((s) => ({
                    id: s.id,
                    name: s.name,
                    currentStatus: s.status,
                  }))}
                />
              )}
            </div>
          );
        })()}
            </section>
            <section>
                <AttendanceCheckingList
                  students={students}
                  sessionId={session?.id ?? null}
                  sessionDate={session?.sessionDate ?? null}
                  startTime={session?.startTime ?? null}
                  endTime={session?.endTime ?? null}
                  classCode={classroom?.classCode ?? null}
                  totalStudents={students.length}
                  femaleStudents={female}
                />
            </section>
        </main>
    )
}
