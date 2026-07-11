import ReportToday from "@/components/table/report_today";
import { AmendmentButton } from '@/components/dashboard/classrooms/amendment-button';
import { Button } from "@/components/ui/button";
import { getServerUser } from "@/auth-server";
import { backendFetch } from '@/lib/api/api-fetch';
import {
  fetchTodaySessionForClassroom,
  isTeacherCorrectionOpen,
  type SessionSummary,
} from "@/lib/auth/session-helpers";
import { AttendanceStatus, type Student } from "@/types/student";

interface Classroom {
  className: string;
  classCode?: string | null;
}

async function fetchClassroom(id: string): Promise<Classroom | null> {
  try {
    const res = await backendFetch(`/classrooms/${id}`);
    if (!res.ok) return null;
    const json = await res.json();
    return json?.payload ?? null;
  } catch { return null; }
}

type StatusEntry = { status: string; reason: string | null };
async function fetchSessionStatusMap(sessionId: number | null): Promise<Map<string, StatusEntry>> {
  const map = new Map<string, StatusEntry>();
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
        map.set(String(studentId), { status, reason: row?.remark ?? null });
      }
    }
  } catch { /* empty map → PENDING */ }
  return map;
}

async function fetchStudents(id: string, statusMap: Map<string, StatusEntry>): Promise<Student[]> {
  try {
    const res = await backendFetch(`/classrooms/${id}/students?size=500`);
    if (!res.ok) return [];
    const json = await res.json();
    const rows = json?.payload?.content ?? json?.payload ?? [];
    if (!Array.isArray(rows)) return [];

    return rows.map((student) => {
      const idKey = String(student.id ?? student.studentNo ?? "");
      // ONLY the attendance status — never fall back to student.status, which is
      // the account status ("ACTIVE") and would masquerade as an attendance state.
      const recorded = statusMap.get(idKey);
      return {
        id: idKey,
        name: String(student.name ?? student.fullName ?? student.username ?? "—"),
        gender: String(student.gender ?? "—"),
        phone: String(student.phone ?? student.phoneNumber ?? "—"),
        dateOfBirth: String(student.dateOfBirth ?? student.dob ?? "—"),
        profile: String(student.profileImage ?? student.profile ?? "/file.svg"),
        status: recorded
          ? (String(recorded.status).toLowerCase() as AttendanceStatus)
          : AttendanceStatus.PENDING,
        reason: recorded?.reason ?? null,
      };
    });
  } catch {
    return [];
  }
}

export default async function CheckedAttendance({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const [classroom, session, user] = await Promise.all([
      fetchClassroom(id),
      fetchTodaySessionForClassroom(id) as Promise<SessionSummary | null>,
      getServerUser(),
    ]);
    const statusMap = await fetchSessionStatusMap(session?.id ?? null);
    const students = await fetchStudents(id, statusMap);
    const isAdmin = (user?.role ?? "").toUpperCase() === "ADMIN";
    const canEditAttendance = isAdmin || isTeacherCorrectionOpen(session);
    const femaleStudents = students.filter((student) => {
      const gender = student.gender?.toLowerCase?.() ?? "";
      return gender === "female" || gender === "f";
    }).length;
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
                </div>
                </div>
                <div className="flex-col">
                  {canEditAttendance ? (
                    <AmendmentButton
                      mode={isAdmin ? "admin" : "teacher"}
                      sessionId={session?.id ?? null}
                      students={students.map((s) => ({
                        id: s.id,
                        name: s.name,
                        currentStatus: s.status,
                      }))}
                    />
                  ) : (
                    <Button disabled variant="outline" className="p-5 cursor-not-allowed">
                      Correction closed
                    </Button>
                  )}
                </div>
            </section>
            <section>
                <ReportToday
                  students={students}
                  sessionId={session?.id ?? null}
                  sessionDate={session?.sessionDate ?? null}
                  startTime={session?.startTime ?? null}
                  endTime={session?.endTime ?? null}
                  classCode={classroom?.classCode ?? null}
                  totalStudents={students.length}
                  femaleStudents={femaleStudents}
                />
                <aside className="mt-4 max-w-md w-87.5 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 my-font dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-200">
                  <p className="border-b border-slate-200 pb-1 font-semibold text-slate-900 dark:border-slate-700 dark:text-white">Note</p>
                  <ul className="space-y-1 mt-2 pl-3 list-disc">
                    <li className="ml-4">
                      <span className="font-semibold">P</span> stands for Present.
                    </li>
                    <li className="ml-4">
                      <span className="font-semibold">PM</span> stands for Permission.
                    </li>
                    <li className="ml-4">
                      <span className="font-semibold">L</span> stands for Late.
                    </li>
                  </ul>
                </aside>
            </section>
        </main>
    );
}
