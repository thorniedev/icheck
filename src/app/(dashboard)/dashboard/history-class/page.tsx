import Link from "next/link";
import { ArchiveIcon } from "lucide-react";
import { MyDropdownMenuCheckboxes } from "@/components/drop-donw";
import { ClassCard } from "@/components/ui/class-card";
import {
  getHistoryClassCounts,
  getHistoryClasses,
  type HistoryClassroom,
} from "@/lib/data/mockData/history-classes";

type Classroom = HistoryClassroom;

const shiftLabel: Record<string, string> = {
  MORNING: "Morning",
  AFTERNOON: "Afternoon",
  EVENING: "Evening",
};

export default async function HistoryClassPage() {
  const historyClassrooms = getHistoryClasses();
  const classCounts = getHistoryClassCounts();
  const grouped = historyClassrooms.reduce<Record<string, Classroom[]>>((acc, c) => {
    const key = c.programTypeName ?? "Other";
    (acc[key] ??= []).push(c);
    return acc;
  }, {});
  const groupNames = Object.keys(grouped).sort();

  return (
    <div className="px-7">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">History Classes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Classes that are no longer active.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 sm:items-end">
          <MyDropdownMenuCheckboxes />

          <span className="pr-2 text-sm text-muted-foreground">
            ({historyClassrooms.length}) {historyClassrooms.length === 1 ? "class" : "classes"}
          </span>
        </div>
      </div>

      {historyClassrooms.length === 0 ? (
        <div className="rounded-2xl border bg-card py-20 text-center text-muted-foreground">
          <ArchiveIcon className="mx-auto mb-3 size-10 opacity-40" />
          <p className="font-medium">No history classes found.</p>
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
                  const counts = classCounts[c.className];
                  return (
                  <Link
                    key={c.id}
                    href={`/dashboard/history-class/${c.id}`}
                    className="block hover:scale-[1.01] transition-transform"
                  >
                    <ClassCard
                      title={c.programTypeName ?? "Class"}
                      status="History"
                      variant="history"
                      classNameValue={c.className}
                      shift={shiftLabel[c.shift] ?? c.shift ?? "-"}
                      time={`${c.startDate ?? "?"} – ${c.endDate ?? "?"}`}
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
