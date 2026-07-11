import Link from "next/link";
import { BookOpenIcon } from "lucide-react";
import { ClassCard } from "@/components/ui/class-card";
import { ClassroomAddButton } from '@/components/dashboard/classrooms/classroom-add-button';
import { ClassroomsBrowser } from '@/components/dashboard/classrooms/classrooms-browser';
import { getServerUser } from "@/auth-server";
import { fetchAllClassrooms, fetchClassCounts, type ClassroomSummary } from "@/lib/utils/classroom-helpers";
import { fetchTeacherActiveClassrooms, type TeacherClassroomView } from "@/lib/auth/session-helpers";
import { formatTime12 } from "@/lib/utils/school-time";

type Classroom = ClassroomSummary;

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

export default async function ClassroomsPage() {
  const user = await getServerUser();
  const role = user?.role ?? "ADMIN";
  const userId = user?.id ?? "";
  const isTeacher = role === "TEACHER";

  // ── Teacher: session-based "My Classes" (today's upcoming/live), grouped. ──
  if (isTeacher) {
    const classrooms = await fetchTeacherActiveClassrooms(userId);
    const classCounts = await fetchClassCounts(classrooms);

    const grouped = classrooms.reduce<Record<string, TeacherClassroomView[]>>((acc, c) => {
      const key = c.programTypeName ?? "Other";
      (acc[key] ??= []).push(c);
      return acc;
    }, {});
    const groupNames = Object.keys(grouped).sort();

    return (
      <div className="px-7 py-7">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">My Classes</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Your classes with a session today (upcoming or live).
            </p>
          </div>
          <span className="text-sm text-muted-foreground">
            ({classrooms.length}) {classrooms.length === 1 ? "class" : "classes"}
          </span>
        </div>

        {classrooms.length === 0 ? (
          <div className="rounded-2xl border bg-card py-20 text-center text-muted-foreground">
            <BookOpenIcon className="mx-auto mb-3 size-10 opacity-40" />
            <p className="font-medium">No class is ready to start right now.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {groupNames.map((group) => (
              <section key={group}>
                <h2 className="mb-3 text-base font-semibold uppercase tracking-wider text-muted-foreground">
                  {group}
                  <span className="ml-2 text-sm font-normal text-muted-foreground/60">
                    ({grouped[group].length})
                  </span>
                </h2>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-6">
                  {grouped[group].map((c) => {
                    const counts = classCounts[c.id];
                    return (
                      <Link
                        key={c.id}
                        href={`/dashboard/classrooms/${c.id}`}
                        className="block transition-transform hover:scale-[1.01]"
                      >
                        <ClassCard
                          title={c.programTypeName ?? "Class"}
                          status="Active"
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
              </section>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Admin: all classes with sort / filter / search. ──
  const allClassrooms = await fetchAllClassrooms(200);
  const classCounts = await fetchClassCounts(allClassrooms);
  const activeClassrooms: Classroom[] = allClassrooms.filter((c) => c.status);

  return (
    <div className="px-7 py-7">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Classes</h1>
          <p className="mt-1 text-sm text-muted-foreground">All classrooms across programs.</p>
        </div>
        <ClassroomAddButton />
      </div>

      <ClassroomsBrowser classrooms={activeClassrooms} classCounts={classCounts} />
    </div>
  );
}
