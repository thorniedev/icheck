"use client";

import { useMemo, useState, type ComponentType, type ReactNode } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import {
  BookOpenIcon,
  UsersIcon,
  ClipboardCheckIcon,
  PercentIcon,
  CheckCircle2Icon,
  Clock3Icon,
  DoorOpenIcon,
  ShieldCheckIcon,
  XCircleIcon,
  AlertTriangleIcon,
  LoaderCircleIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useGetProgramTypesQuery } from "@/store/api/programTypeApi";
import {
  useGetDashboardAnalyticsQuery,
  useGetClassroomsLiteQuery,
} from "@/store/api/dashboardApi";

const COLORS = {
  present: "#22c55e",
  late: "#f59e0b",
  lateOut: "#fb923c",
  permission: "#3b82f6",
  absent: "#ef4444",
  rate: "#6366f1",
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const SHIFTS = ["MORNING", "AFTERNOON", "EVENING"];

interface Props {
  /** Pass to scope analytics to one teacher's classes (teacher dashboard). */
  teacherId?: number;
  heading?: string;
  /** Teacher / student views drop the line/pie/bar graphs (cards + tables only). */
  showCharts?: boolean;
}

export function AdminDashboard({ teacherId, heading = "Admin Dashboard", showCharts = true }: Props) {
  const now = new Date();
  const [month, setMonth] = useState<number | null>(now.getMonth() + 1);
  const [year, setYear] = useState<number>(now.getFullYear());
  const [programTypeId, setProgramTypeId] = useState<number | null>(null);
  const [generation, setGeneration] = useState<number | null>(null);
  const [classroomId, setClassroomId] = useState<number | null>(null);
  const [shift, setShift] = useState<string | null>(null);

  const { data: programTypes = [] } = useGetProgramTypesQuery();
  const { data: classrooms = [] } = useGetClassroomsLiteQuery();

  const generations = useMemo(
    () =>
      Array.from(new Set(classrooms.map((c) => c.generation).filter((g): g is number => g != null))).sort(
        (a, b) => a - b
      ),
    [classrooms]
  );

  const classOptions = useMemo(
    () =>
      classrooms
        .filter((c) => {
          if (programTypeId != null) {
            const pt = programTypes.find((p) => p.id === programTypeId);
            if (pt && c.programTypeName !== pt.name) return false;
          }
          if (generation != null && c.generation !== generation) return false;
          if (shift && c.shift !== shift) return false;
          return true;
        })
        .sort((a, b) => a.className.localeCompare(b.className)),
    [classrooms, programTypes, programTypeId, generation, shift]
  );

  const { data, isFetching, isError } = useGetDashboardAnalyticsQuery({
    month,
    year,
    programTypeId,
    generation,
    classroomId,
    shift,
    teacherId,
  });

  const summary = data?.summary;
  const years = Array.from({ length: 4 }, (_, i) => now.getFullYear() - i);

  // Per-day rates for the trend chart.
  const trend = useMemo(
    () =>
      (data?.trend ?? []).map((t) => {
        const total = t.present + t.late + t.lateOut + t.permission + t.absent;
        const day = Number(t.date.slice(8, 10)) || t.date;
        return {
          day,
          presentRate: total ? Math.round((t.present * 1000) / total) / 10 : 0,
          lateRate: total ? Math.round((t.late * 1000) / total) / 10 : 0,
          absentRate: total ? Math.round((t.absent * 1000) / total) / 10 : 0,
        };
      }),
    [data?.trend]
  );

  const statusPie = summary
    ? [
        { name: "Present", value: summary.present, color: COLORS.present },
        { name: "Late", value: summary.late, color: COLORS.late },
        { name: "Late Out", value: summary.lateOut, color: COLORS.lateOut },
        { name: "Permission", value: summary.permission, color: COLORS.permission },
        { name: "Absent", value: summary.absent, color: COLORS.absent },
      ].filter((s) => s.value > 0)
    : [];

  const programBars = (data?.programBreakdown ?? []).map((p) => ({
    name: p.generation != null ? `${p.programType} G${p.generation}` : p.programType,
    attendanceRate: p.attendanceRate,
  }));

  const atRiskClasses = (data?.classBreakdown ?? []).filter((c) => c.atRiskStudents > 0);

  // Class Ranking is a table (not a graph), so it stays in every view.
  const rankingCard = (
    <ChartCard title="Class Ranking" description="By attendance rate">
      <div className="max-h-[320px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-card text-left text-xs text-muted-foreground">
            <tr className="border-b border-border">
              <th className="py-2 pr-2 font-medium">#</th>
              <th className="py-2 pr-2 font-medium">Class</th>
              <th className="py-2 pr-2 text-right font-medium">Rate</th>
              <th className="py-2 pr-2 text-right font-medium">Absent</th>
              <th className="py-2 text-right font-medium">At-risk</th>
            </tr>
          </thead>
          <tbody>
            {(data?.classBreakdown ?? []).map((c, i) => (
              <tr key={c.classroomId} className="border-b border-border/60">
                <td className="py-2 pr-2 text-muted-foreground/70">{i + 1}</td>
                <td className="py-2 pr-2">
                  <div className="font-medium text-foreground">{c.className}</div>
                  <div className="text-xs text-muted-foreground/70">{c.classCode}</div>
                </td>
                <td className="py-2 pr-2 text-right font-semibold tabular-nums">{c.attendanceRate}%</td>
                <td className="py-2 pr-2 text-right tabular-nums">{c.absent}</td>
                <td className="py-2 text-right tabular-nums">
                  {c.atRiskStudents > 0 ? (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-950/50 dark:text-red-300">
                      {c.atRiskStudents}
                    </span>
                  ) : (
                    <span className="text-muted-foreground/50">0</span>
                  )}
                </td>
              </tr>
            ))}
            {(data?.classBreakdown ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="py-10 text-center text-muted-foreground/70">
                  No class data for this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </ChartCard>
  );

  return (
    <div className="space-y-6 px-5 py-6 sm:px-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold text-foreground">{heading}</h1>
        {isFetching && <LoaderCircleIcon className="size-5 animate-spin text-muted-foreground" />}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card p-4">
        <FilterSelect
          label="Month"
          value={month == null ? "" : String(month)}
          onChange={(v) => setMonth(v === "" ? null : Number(v))}
          options={[{ value: "", label: "All months" }, ...MONTHS.map((m, i) => ({ value: String(i + 1), label: m }))]}
        />
        <FilterSelect
          label="Year"
          value={String(year)}
          onChange={(v) => setYear(Number(v))}
          options={years.map((y) => ({ value: String(y), label: String(y) }))}
        />
        <FilterSelect
          label="Program"
          value={programTypeId == null ? "" : String(programTypeId)}
          onChange={(v) => {
            setProgramTypeId(v === "" ? null : Number(v));
            setClassroomId(null);
          }}
          options={[{ value: "", label: "All programs" }, ...programTypes.map((p) => ({ value: String(p.id), label: p.name }))]}
        />
        <FilterSelect
          label="Generation"
          value={generation == null ? "" : String(generation)}
          onChange={(v) => {
            setGeneration(v === "" ? null : Number(v));
            setClassroomId(null);
          }}
          options={[{ value: "", label: "All" }, ...generations.map((g) => ({ value: String(g), label: `Gen ${g}` }))]}
        />
        <FilterSelect
          label="Class"
          value={classroomId == null ? "" : String(classroomId)}
          onChange={(v) => setClassroomId(v === "" ? null : Number(v))}
          options={[{ value: "", label: "All classes" }, ...classOptions.map((c) => ({ value: String(c.id), label: c.className }))]}
        />
        <FilterSelect
          label="Shift"
          value={shift ?? ""}
          onChange={(v) => setShift(v === "" ? null : v)}
          options={[{ value: "", label: "All shifts" }, ...SHIFTS.map((s) => ({ value: s, label: s.charAt(0) + s.slice(1).toLowerCase() }))]}
        />
      </div>

      {isError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
          Failed to load analytics.
        </div>
      ) : (
        <>
          {/* Main cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard label="Total Classes" value={summary?.totalClasses} icon={BookOpenIcon} tint="text-blue-600 bg-blue-50 dark:bg-blue-950/40" />
            <StatCard label="Total Students" value={summary?.totalStudents} icon={UsersIcon} tint="text-purple-600 bg-purple-50 dark:bg-purple-950/40" />
            <StatCard label="Sessions Completed" value={summary?.sessionsCompleted} icon={ClipboardCheckIcon} tint="text-teal-600 bg-teal-50 dark:bg-teal-950/40" />
            <StatCard label="Attendance Rate" value={summary?.attendanceRate} suffix="%" icon={PercentIcon} tint="text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40" />
            <StatCard label="At Risk Students" value={summary?.atRiskStudents} icon={AlertTriangleIcon} tint="text-red-600 bg-red-50 dark:bg-red-950/40" />
            <StatCard label="Present" value={summary?.present} icon={CheckCircle2Icon} tint="text-green-600 bg-green-50 dark:bg-green-950/40" />
            <StatCard label="Late" value={summary?.late} icon={Clock3Icon} tint="text-amber-600 bg-amber-50 dark:bg-amber-950/40" />
            <StatCard label="Late Out" value={summary?.lateOut} icon={DoorOpenIcon} tint="text-orange-600 bg-orange-50 dark:bg-orange-950/40" />
            <StatCard label="Permission" value={summary?.permission} icon={ShieldCheckIcon} tint="text-sky-600 bg-sky-50 dark:bg-sky-950/40" />
            <StatCard label="Absent" value={summary?.absent} icon={XCircleIcon} tint="text-rose-600 bg-rose-50 dark:bg-rose-950/40" />
          </div>

          {/* Graphs — admin only. Teacher/Student get cards + tables. */}
          {showCharts && (
            <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
              <ChartCard title="Monthly Attendance Trend" description="Present / Late / Absent rate by day">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trend} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                    <YAxis unit="%" tick={{ fontSize: 12 }} domain={[0, 100]} allowDataOverflow />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="presentRate" name="Present" stroke={COLORS.present} strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="lateRate" name="Late" stroke={COLORS.late} strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="absentRate" name="Absent" stroke={COLORS.absent} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Attendance Status Breakdown" description="Across the selected range">
                {statusPie.length === 0 ? (
                  <EmptyChart />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={statusPie} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={2}>
                        {statusPie.map((s) => (
                          <Cell key={s.name} fill={s.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>
            </div>
          )}

          {showCharts ? (
            <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
              <ChartCard title="Program Type Comparison" description="Attendance rate by program">
                {programBars.length === 0 ? (
                  <EmptyChart />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={programBars} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={50} />
                      <YAxis unit="%" tick={{ fontSize: 12 }} domain={[0, 100]} allowDataOverflow />
                      <Tooltip />
                      <Bar dataKey="attendanceRate" name="Attendance %" fill={COLORS.rate} radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              {rankingCard}
            </div>
          ) : (
            rankingCard
          )}

          {/* At-risk panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangleIcon className="size-5 text-red-500" />
                At Risk Students
              </CardTitle>
              <CardDescription>
                {summary?.atRiskStudents ?? 0} student(s) below the minimum attendance requirement
                {atRiskClasses.length > 0 ? `, across ${atRiskClasses.length} classes.` : "."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {atRiskClasses.length === 0 ? (
                <p className="text-sm text-muted-foreground">No at-risk students in this view. 🎉</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {atRiskClasses.map((c) => (
                    <span
                      key={c.classroomId}
                      className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm dark:border-red-900/40 dark:bg-red-950/30"
                    >
                      <span className="font-medium text-foreground">{c.className}</span>
                      <span className="ml-2 font-semibold text-red-600 dark:text-red-300">{c.atRiskStudents}</span>
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="font-medium text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 min-w-[7rem] rounded-lg border border-border bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function StatCard({
  label,
  value,
  suffix,
  icon: Icon,
  tint,
}: {
  label: string;
  value: number | undefined;
  suffix?: string;
  icon: ComponentType<{ className?: string }>;
  tint: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
      <div className={`rounded-xl p-2.5 ${tint}`}>
        <Icon className="size-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xl font-bold tabular-nums text-foreground">
          {value == null ? "—" : value.toLocaleString()}
          {suffix && value != null ? suffix : ""}
        </p>
        <p className="truncate text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function ChartCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground/70">
      No data for this filter.
    </div>
  );
}
