import Link from "next/link";
import { ArchiveIcon, BookOpenIcon, CalendarClockIcon, ClockIcon } from "lucide-react";
import { getServerUser } from "@/auth-server";
import { AdminDashboard } from "@/components/dashboard";
import { Button } from "@/components/ui/button";
import { ClassCard } from "@/components/ui/class-card";
import {
  fetchClassCounts,
  fetchTeacherClassrooms,
} from "@/lib/utils/classroom-helpers";
import {
  fetchTeacherActiveClassrooms,
  type TeacherClassroomView,
} from "@/lib/auth/session-helpers";
import { formatTime12 } from "@/lib/utils/school-time";

const shiftLabel: Record<string, string> = {
  MORNING: "Morning",
  AFTERNOON: "Afternoon",
  EVENING: "Evening",
};

function teacherClassPeriod(c: TeacherClassroomView) {
  return c.activeSession?.startTime
    ? `${formatTime12(c.activeSession.startTime)} - ${formatTime12(c.activeSession.endTime)}`
    : `${c.startDate ?? "?"} - ${c.endDate ?? "?"}`;
}

function sessionStatus(c: TeacherClassroomView) {
  return c.activeSession?.status?.toUpperCase() === "ACTIVE" ? "Active" : "Upcoming";
}

function TeacherClassGrid({
  classrooms,
  classCounts,
  emptyText,
}: {
  classrooms: TeacherClassroomView[];
  classCounts: Record<number, { total: number; female: number }>;
  emptyText: string;
}) {
  if (classrooms.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card py-14 text-center text-muted-foreground">
        <BookOpenIcon className="mx-auto mb-3 size-9 opacity-40" />
        <p className="font-medium">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-6">
      {classrooms.map((c) => {
        const counts = classCounts[c.id];
        return (
          <Link
            key={`${c.id}-${c.activeSession?.id ?? "schedule"}`}
            href={`/dashboard/classrooms/${c.id}`}
            className="block transition-transform hover:scale-[1.01]"
          >
            <ClassCard
              title={c.programTypeName ?? "Class"}
              status={sessionStatus(c)}
              classNameValue={c.className}
              shift={shiftLabel[c.shift] ?? c.shift ?? "—"}
              time={teacherClassPeriod(c)}
              lab={c.lab ?? undefined}
              students={counts ? `${counts.total}/${counts.female}` : "0/0"}
              code={c.classCode ?? String(c.id)}
              year={c.year}
              semester={c.semester}
              generation={c.generation}
            />
          </Link>
        );
      })}
    </div>
  );
}

async function TeacherDashboard({ teacherId }: { teacherId: string }) {
  const [allClassrooms, todayClassrooms] = await Promise.all([
    fetchTeacherClassrooms(teacherId, 200),
    fetchTeacherActiveClassrooms(teacherId),
  ]);
  const classCounts = await fetchClassCounts(todayClassrooms);
  const activeClassrooms = todayClassrooms.filter(
    (classroom) => classroom.activeSession?.status?.toUpperCase() === "ACTIVE"
  );
  const upcomingClassrooms = todayClassrooms.filter(
    (classroom) => classroom.activeSession?.status?.toUpperCase() !== "ACTIVE"
  );

  return (
    <div className="space-y-6 px-5 py-6 sm:px-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Classes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Today&apos;s active and upcoming classes.
          </p>
        </div>
        <Button asChild variant="outline" size="lg">
          <Link href="/dashboard/history-class">
            <ArchiveIcon className="size-4" />
            History Classes
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <TeacherMetric
          icon={BookOpenIcon}
          label="Total Classes"
          value={allClassrooms.length}
        />
        <TeacherMetric
          icon={CalendarClockIcon}
          label="Active Now"
          value={activeClassrooms.length}
        />
        <TeacherMetric
          icon={ClockIcon}
          label="Upcoming Today"
          value={upcomingClassrooms.length}
        />
      </div>

      <section className="space-y-3">
        <SectionHeading title="Active Class" count={activeClassrooms.length} />
        <TeacherClassGrid
          classrooms={activeClassrooms}
          classCounts={classCounts}
          emptyText="No active class right now."
        />
      </section>

      <section className="space-y-3">
        <SectionHeading title="Upcoming Class" count={upcomingClassrooms.length} />
        <TeacherClassGrid
          classrooms={upcomingClassrooms}
          classCounts={classCounts}
          emptyText="No upcoming class for today."
        />
      </section>
    </div>
  );
}

function TeacherMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BookOpenIcon;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-3xl font-bold text-foreground tabular-nums">{value}</p>
      </div>
      <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="size-5" />
      </div>
    </div>
  );
}

function SectionHeading({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-base font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>
      <span className="text-sm text-muted-foreground">
        ({count}) {count === 1 ? "class" : "classes"}
      </span>
    </div>
  );
}

export default async function DashboardPage() {
  const user = await getServerUser();
  const role = user?.role ?? "ADMIN";
  const userId = user?.id ?? "";
  const isTeacher = role === "TEACHER";

  // Teacher → focused class overview; Admin → school-wide dashboard.
  return isTeacher ? (
    <TeacherDashboard teacherId={userId} />
  ) : (
    <AdminDashboard heading="Admin Dashboard" />
  );
}
