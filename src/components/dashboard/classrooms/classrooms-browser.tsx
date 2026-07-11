"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  SearchIcon,
  XIcon,
  BookOpenIcon,
  SlidersHorizontalIcon,
  FilterXIcon,
  ArrowUpDownIcon,
  ArrowUpAZIcon,
  ArrowDownAZIcon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ClassCard } from "@/components/ui/class-card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ClassroomSummary } from "@/lib/utils/classroom-helpers";
import {
  PROGRAM_CATEGORIES,
  programCategoryOf,
  scholarshipCourseOf,
} from "@/lib/program-category";

const SHIFT_LABEL: Record<string, string> = {
  MORNING: "Morning",
  AFTERNOON: "Afternoon",
  EVENING: "Evening",
};

type Counts = Record<number, { total: number; female: number }>;
type SortKey = "name" | "code" | "generation" | "startDate";
type SortDir = "asc" | "desc";
type StatusFilter = "all" | "active" | "inactive";

const ALL = "__all__";

const SORT_LABEL: Record<SortKey, string> = {
  name: "Name",
  code: "Code",
  generation: "Generation",
  startDate: "Start date",
};

interface Props {
  classrooms: ClassroomSummary[];
  classCounts: Counts;
}

/**
 * Admin "Classes" browser — client-side sort (asc/desc), filters and search.
 * The Program filter is one of the 3 categories (Higher Degree / Bachelor /
 * Scholarship); picking Scholarship reveals its Course sub-filter.
 */
export function ClassroomsBrowser({ classrooms, classCounts }: Props) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>(ALL);
  const [course, setCourse] = useState<string>(ALL);
  const [shift, setShift] = useState<string>(ALL);
  const [generation, setGeneration] = useState<string>(ALL);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const shiftOptions = useMemo(
    () => Array.from(new Set(classrooms.map((c) => c.shift).filter(Boolean))).sort(),
    [classrooms]
  );
  const generationOptions = useMemo(
    () =>
      Array.from(new Set(classrooms.map((c) => c.generation).filter((g) => g != null))).sort(
        (a, b) => a - b
      ),
    [classrooms]
  );
  // Courses that actually exist among the Scholarship classes.
  const courseOptions = useMemo(
    () =>
      Array.from(
        new Set(
          classrooms
            .filter((c) => programCategoryOf(c.programTypeName) === "SCHOLARSHIP")
            .map((c) => scholarshipCourseOf(c.className))
            .filter((c): c is string => c != null)
        )
      ).sort(),
    [classrooms]
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = classrooms.filter((c) => {
      if (category !== ALL && programCategoryOf(c.programTypeName) !== category) return false;
      if (category === "SCHOLARSHIP" && course !== ALL && scholarshipCourseOf(c.className) !== course)
        return false;
      if (shift !== ALL && c.shift !== shift) return false;
      if (generation !== ALL && String(c.generation) !== generation) return false;
      if (status === "active" && !c.status) return false;
      if (status === "inactive" && c.status) return false;
      if (q) {
        const hay = [
          c.className,
          c.classCode,
          c.programTypeName,
          c.shift,
          `gen ${c.generation}`,
          c.year != null ? `year ${c.year}` : "",
          c.semester != null ? `sem ${c.semester}` : "",
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const dir = sortDir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name":
          cmp = a.className.localeCompare(b.className);
          break;
        case "code":
          cmp = (a.classCode ?? "").localeCompare(b.classCode ?? "");
          break;
        case "generation":
          cmp = (a.generation ?? 0) - (b.generation ?? 0);
          break;
        case "startDate":
          cmp = (a.startDate ?? "").localeCompare(b.startDate ?? "");
          break;
      }
      if (cmp === 0) cmp = a.className.localeCompare(b.className);
      return cmp * dir;
    });
  }, [classrooms, query, category, course, shift, generation, status, sortKey, sortDir]);

  const activeFilters =
    (category !== ALL ? 1 : 0) +
    (category === "SCHOLARSHIP" && course !== ALL ? 1 : 0) +
    (shift !== ALL ? 1 : 0) +
    (generation !== ALL ? 1 : 0) +
    (status !== "all" ? 1 : 0);

  function reset() {
    setCategory(ALL);
    setCourse(ALL);
    setShift(ALL);
    setGeneration(ALL);
    setStatus("all");
    setQuery("");
  }

  function changeCategory(v: string) {
    setCategory(v);
    if (v !== "SCHOLARSHIP") setCourse(ALL);
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-md flex-1 min-w-52">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/60" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search class name, code, program…"
            className="pl-9 pr-9"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground/70 hover:bg-muted hover:text-foreground"
            >
              <XIcon className="size-4" />
            </button>
          )}
        </div>

        {/* Filters */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <SlidersHorizontalIcon className="size-4" /> Filters
              {activeFilters > 0 && (
                <span className="ml-1 rounded-full bg-primary px-1.5 text-xs text-primary-foreground">
                  {activeFilters}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-[70vh] w-56 overflow-y-auto">
            <DropdownMenuLabel>Program</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={category} onValueChange={changeCategory}>
              <DropdownMenuRadioItem value={ALL}>All programs</DropdownMenuRadioItem>
              {PROGRAM_CATEGORIES.map((c) => (
                <DropdownMenuRadioItem key={c.value} value={c.value}>
                  {c.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>

            {category === "SCHOLARSHIP" && courseOptions.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Course</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={course} onValueChange={setCourse}>
                  <DropdownMenuRadioItem value={ALL}>All courses</DropdownMenuRadioItem>
                  {courseOptions.map((c) => (
                    <DropdownMenuRadioItem key={c} value={c}>
                      {c}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </>
            )}

            <DropdownMenuSeparator />
            <DropdownMenuLabel>Shift</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={shift} onValueChange={setShift}>
              <DropdownMenuRadioItem value={ALL}>All shifts</DropdownMenuRadioItem>
              {shiftOptions.map((s) => (
                <DropdownMenuRadioItem key={s} value={s}>
                  {SHIFT_LABEL[s] ?? s}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Generation</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={generation} onValueChange={setGeneration}>
              <DropdownMenuRadioItem value={ALL}>All generations</DropdownMenuRadioItem>
              {generationOptions.map((g) => (
                <DropdownMenuRadioItem key={g} value={String(g)}>
                  Gen {g}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Status</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={status}
              onValueChange={(v) => setStatus(v as StatusFilter)}
            >
              <DropdownMenuRadioItem value="all">All</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="active">Active</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="inactive">Inactive</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Sort field */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <ArrowUpDownIcon className="size-4" /> Sort: {SORT_LABEL[sortKey]}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuLabel>Sort by</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
              <DropdownMenuRadioItem value="name">Name</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="code">Code</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="generation">Generation</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="startDate">Start date</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Sort direction */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
          aria-label="Toggle sort direction"
          title={sortDir === "asc" ? "Ascending" : "Descending"}
        >
          {sortDir === "asc" ? (
            <ArrowUpAZIcon className="size-4" />
          ) : (
            <ArrowDownAZIcon className="size-4" />
          )}
        </Button>

        {(activeFilters > 0 || query) && (
          <Button variant="ghost" className="gap-1.5 text-muted-foreground" onClick={reset}>
            <FilterXIcon className="size-4" /> Clear
          </Button>
        )}

        <span className="ml-auto text-sm text-muted-foreground">
          {visible.length} {visible.length === 1 ? "class" : "classes"}
        </span>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border bg-card py-20 text-center text-muted-foreground">
          <BookOpenIcon className="mx-auto mb-3 size-10 opacity-40" />
          <p className="font-medium">
            {query || activeFilters > 0 ? "No classes match your filters." : "No classes found."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-6">
          {visible.map((c) => {
            const counts = classCounts[c.id];
            return (
              <Link
                key={c.id}
                href={`/dashboard/classrooms/${c.id}`}
                className="block transition-transform hover:scale-[1.01]"
              >
                <ClassCard
                  title={c.programTypeName ?? "Class"}
                  status={c.status ? "Active" : "Inactive"}
                  classNameValue={c.className}
                  shift={SHIFT_LABEL[c.shift] ?? c.shift ?? "—"}
                  time={`${c.startDate ?? "?"} - ${c.endDate ?? "?"}`}
                  lab={c.lab ?? undefined}
                  students={counts ? `${counts.total}/${counts.female}` : "0/0"}
                  code={c.classCode ?? String(c.id)}
                  year={c.year}
                  semester={c.semester}
                  generation={c.generation}
                  course={
                    /scholarship/i.test(c.programTypeName ?? "")
                      ? c.className.match(/Fullstack|Foundation|Pre-?Uni|ITP|ITE/i)?.[0] ?? null
                      : null
                  }
                />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
