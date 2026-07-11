import Link from "next/link";
import { notFound } from "next/navigation";
import { ArchiveIcon, ArrowLeftIcon, CalendarDaysIcon, ClockIcon, ShieldCheckIcon, UsersIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  getHistoryAttendanceTotals,
  getHistoryClassById,
  getHistoryStudentsByClassId,
  type HistoryAttendanceStatus,
} from "@/lib/data/mockData/history-classes";

const statusLabel: Record<HistoryAttendanceStatus, string> = {
  PRESENT: "Present",
  LATE: "Late",
  PERMISSION: "Permission",
};

const statusClassName: Record<HistoryAttendanceStatus, string> = {
  PRESENT: "bg-green-100 text-green-700 hover:bg-green-100",
  LATE: "bg-amber-100 text-amber-700 hover:bg-amber-100",
  PERMISSION: "bg-sky-100 text-sky-700 hover:bg-sky-100",
};

export default async function HistoryClassDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const classroom = getHistoryClassById(Number(id));

  if (!classroom) notFound();

  const students = getHistoryStudentsByClassId(classroom.id);
  const totals = getHistoryAttendanceTotals(students);
  const dates = students[0]?.attendances.map((attendance) => attendance.date) ?? [];

  return (
    <div className="mx-auto w-full px-7">
      <section className="mb-6 w-full">
        <Link
          href="/dashboard/history-class"
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" />
          History Classes
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-zinc-300 bg-zinc-50 p-5 dark:border-zinc-700 dark:bg-zinc-900/40">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <ArchiveIcon className="size-5 text-muted-foreground" />
              <Badge className="border border-zinc-200 bg-zinc-100 text-zinc-700 hover:bg-zinc-100">
                History
              </Badge>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              {classroom.className}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {classroom.programTypeName} · Code {classroom.classCode}
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-background px-2 py-1">
                <CalendarDaysIcon className="size-4" />
                {classroom.startDate} - {classroom.endDate}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-md bg-background px-2 py-1">
                <ClockIcon className="size-4" />
                {classroom.shift.toLowerCase()}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-md bg-background px-2 py-1">
                <ShieldCheckIcon className="size-4" />
                Gen {classroom.generation} · {classroom.lab}
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard label="Present" value={totals.PRESENT} tone="text-green-700" />
        <SummaryCard label="Late" value={totals.LATE} tone="text-amber-700" />
        <SummaryCard label="Permission" value={totals.PERMISSION} tone="text-sky-700" />
        <SummaryCard
          label="Attendance rate"
          value={`${Math.round(((totals.PRESENT + totals.LATE + totals.PERMISSION) / Math.max(totals.total, 1)) * 100)}%`}
          tone="text-primary"
        />
      </div>

      <div className="mb-5 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xl font-semibold text-foreground">
          <UsersIcon className="size-5 text-muted-foreground" />
          Student Attendance History
        </h2>
        <span className="text-sm text-muted-foreground/70">
          {students.length} enrolled
        </span>
      </div>

      {students.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card py-16 text-center text-muted-foreground/70">
          <UsersIcon className="mx-auto mb-3 size-10 opacity-40" />
          <p className="font-medium">No students enrolled.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full text-base">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">#</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Student</th>
                <th className="hidden px-4 py-3 text-left font-semibold text-muted-foreground sm:table-cell">Student No.</th>
                <th className="hidden px-4 py-3 text-left font-semibold text-muted-foreground md:table-cell">Gender</th>
                {dates.map((date) => (
                  <th key={date} className="px-4 py-3 text-left font-semibold text-muted-foreground">
                    {date.slice(5)}
                  </th>
                ))}
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Summary</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student, index) => {
                const late = student.attendances.filter((attendance) => attendance.status === "LATE").length;
                const permission = student.attendances.filter((attendance) => attendance.status === "PERMISSION").length;
                return (
                  <tr
                    key={student.id}
                    className={`border-b border-border/50 transition-colors hover:bg-muted/50 ${
                      index === students.length - 1 ? "border-b-0" : ""
                    }`}
                  >
                    <td className="w-10 px-4 py-3 text-sm text-muted-foreground/70">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{student.name}</p>
                      <p className="text-sm text-muted-foreground/70">{student.email}</p>
                    </td>
                    <td className="hidden px-4 py-3 font-mono text-sm text-muted-foreground sm:table-cell">
                      {student.studentNo}
                    </td>
                    <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                      {student.gender === "M" ? "Male" : "Female"}
                    </td>
                    {student.attendances.map((attendance) => (
                      <td key={`${student.id}-${attendance.date}`} className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <Badge className={statusClassName[attendance.status]}>
                            {statusLabel[attendance.status]}
                          </Badge>
                          <span className="text-xs text-muted-foreground/60">{attendance.checkInTime}</span>
                        </div>
                      </td>
                    ))}
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {late} late · {permission} permission
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: number | string; tone: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${tone}`}>{value}</p>
    </div>
  );
}
