
import { Badge } from "@/components/ui/badge";
import { ArrowLeftIcon, ClipboardCheckIcon } from "lucide-react";
import Link from "next/link";
import { backendFetch } from "@/lib/api-fetch";

interface Session {
  id: number;
  classroomName: string;
  subjectName: string | null;
  teacherName: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  status: string;
}

interface AttendanceRecord {
  id: number;
  studentName: string;
  subjectName: string | null;
  status: string;
  method: string;
  checkInTime: string;
  remark: string | null;
  isSuspicious: boolean;
  isValidLocation: boolean;
}

async function fetchSession(id: string): Promise<Session | null> {
  try {
    const res = await backendFetch(`/api/v1/attendances/sessions/${id}`);
    if (!res.ok) return null;
    const json = await res.json();
    return json?.payload ?? null;
  } catch {
    return null;
  }
}

async function fetchAttendances(sessionId: string): Promise<AttendanceRecord[]> {
  try {
    const res = await backendFetch(`/api/v1/attendances/sessions/${sessionId}?size=100`);
    if (!res.ok) return [];
    const json = await res.json();
    return json?.payload?.content ?? [];
  } catch {
    return [];
  }
}

const attendanceStatusColor: Record<string, string> = {
  PRESENT: "bg-green-100 text-green-700",
  LATE: "bg-yellow-100 text-yellow-700",
  ABSENT: "bg-red-100 text-red-600",
  EXCUSED: "bg-blue-100 text-blue-600",
};

const sessionStatusColor: Record<string, string> = {
  UPCOMING: "bg-blue-100 text-blue-700",
  SCHEDULED: "bg-blue-100 text-blue-700",
  ACTIVE: "bg-green-100 text-green-700",
  COMPLETED: "bg-muted text-muted-foreground",
  CANCELLED: "bg-red-100 text-red-600",
};

export default async function AttendanceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [session, records] = await Promise.all([
    fetchSession(id),
    fetchAttendances(id),
  ]);

  return (
    <div className="px-5 py-8">
      {/* Back */}
      <Link
        href="/attendance"
        className="mb-6 inline-flex items-center gap-1.5 text-base text-muted-foreground hover:text-foreground/80"
      >
        <ArrowLeftIcon className="size-4" />
        Back to Attendance
      </Link>

      {/* Session info */}
      {session ? (
        <div className="bg-card rounded-2xl border border-border p-5 mb-6">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{session.subjectName || "Attendance Session"}</h1>
              <p className="text-muted-foreground mt-1">{session.classroomName} &nbsp;·&nbsp; {session.teacherName}</p>
              <p className="mt-0.5 text-sm text-muted-foreground/70">
                {session.sessionDate} &nbsp;·&nbsp; {session.startTime?.slice(0, 5)} – {session.endTime?.slice(0, 5)}
              </p>
            </div>
            <Badge className={`${sessionStatusColor[session.status] ?? "bg-muted text-muted-foreground"} shrink-0`}>
              {session.status}
            </Badge>
          </div>
        </div>
      ) : (
        <h1 className="text-2xl font-bold text-foreground mb-6">Session #{id}</h1>
      )}

      {/* Attendance records */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-foreground">Attendance Records</h2>
        <span className="text-sm text-muted-foreground/70">{records.length} students</span>
      </div>

      {records.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground/70 bg-card rounded-2xl border border-border">
          <ClipboardCheckIcon className="size-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No attendance records yet</p>
          <p className="mt-1 text-base">Students check in via QR code during the session.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden bg-card">
          <table className="w-full text-base">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Student</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Method</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Check-in Time</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Flags</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r, index) => (
                <tr
                  key={r.id}
                  className={`border-b border-border/50 hover:bg-muted/50 transition-colors ${
                    index === records.length - 1 ? "border-b-0" : ""
                  }`}
                >
                  <td className="px-4 py-3">
                    <span className="font-medium text-foreground">{r.studentName}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      className={`text-xs ${attendanceStatusColor[r.status] ?? "bg-muted text-muted-foreground"}`}
                    >
                      {r.status}
                    </Badge>
                  </td>
                  <td className="hidden px-4 py-3 text-sm text-muted-foreground sm:table-cell">
                    {r.method?.replace("_", " ") ?? "—"}
                  </td>
                  <td className="hidden px-4 py-3 text-sm text-muted-foreground/70 md:table-cell">
                    {r.checkInTime
                      ? new Date(r.checkInTime).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <div className="flex gap-1.5">
                      {r.isSuspicious && (
                        <Badge className="bg-red-50 text-red-500 text-[10px]">Suspicious</Badge>
                      )}
                      {r.isValidLocation === false && (
                        <Badge className="bg-orange-50 text-orange-500 text-[10px]">Off-site</Badge>
                      )}
                      {!r.isSuspicious && r.isValidLocation !== false && (
                        <span className="text-sm text-muted-foreground/40">—</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
