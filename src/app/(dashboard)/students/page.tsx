"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ResetDeviceButton } from "@/components/reset-device-button";
import { useUser } from "@/components/user-provider";
import {
  UsersIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SearchIcon,
  XIcon,
  PlusIcon,
  MoreVerticalIcon,
  PencilIcon,
  TrashIcon,
} from "lucide-react";
import { useGetClassroomsQuery, type ClassroomDto } from "@/store/api/attendanceApi";
import {
  useGetStudentsQuery,
  useDeleteStudentMutation,
  type StudentDto,
} from "@/store/api/userApi";
import { StudentFormDialog, type StudentFormValue } from "@/components/student-form-dialog";
import { useEnrollStudentMutation } from "@/store/api/enrollmentApi";
import { getErrorMessage } from "@/lib/api/error-utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  PROGRAM_CATEGORIES,
  PROGRAM_CATEGORY_LABEL,
  programCategoryOf,
  SCHOLARSHIP_COURSES,
  isSemesterCategory,
  type ProgramCategory,
} from '@/lib/utils/program-category';

const SHIFTS = ["MORNING", "AFTERNOON", "EVENING"];
const SHIFT_LABEL: Record<string, string> = { MORNING: "Morning", AFTERNOON: "Afternoon", EVENING: "Evening" };

export default function StudentsPage() {
  const user = useUser();
  const isAdmin = user?.role === "ADMIN";

  // Teachers now live on the dedicated /teachers sidebar route — this page is
  // exclusively the Students list (no in-page Students/Teachers switcher).
  return (
    <div className="px-4 sm:px-6 lg:px-8 pt-10 pb-8 max-w-[1400px] mx-auto w-full">
      <StudentsView isAdmin={isAdmin} />
    </div>
  );
}

const PAGE_SIZE = 10;

// ── Students view ───────────────────────────────────────────────────────────
function StudentsView({ isAdmin }: { isAdmin: boolean }) {
  const { data: students = [], isLoading: loadingStudents } = useGetStudentsQuery();
  const { data: classrooms = [], isLoading: loadingClassrooms } = useGetClassroomsQuery({ size: 1000 });
  const [deleteStudent] = useDeleteStudentMutation();
  const [enrollStudent] = useEnrollStudentMutation();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<StudentFormValue | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [targetClassId, setTargetClassId] = useState("");
  const [bulkEnrolling, setBulkEnrolling] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [programType, setProgramType] = useState<"ALL" | ProgramCategory>("ALL");
  const [filterYear, setFilterYear]         = useState("");
  const [filterSemester, setFilterSemester] = useState("");
  const [filterShift, setFilterShift]       = useState("");
  const [filterGeneration, setFilterGeneration] = useState("");
  const [filterCourse, setFilterCourse]     = useState(""); // scholarship only

  // Build class → metadata lookup
  const classMap = useMemo(() => {
    const m = new Map<string, ClassroomDto>();
    for (const c of classrooms) m.set(c.className, c);
    return m;
  }, [classrooms]);

  // Classrooms in the selected category drive the secondary filter options.
  const categoryClassrooms = useMemo(
    () =>
      programType === "ALL"
        ? []
        : classrooms.filter((c) => programCategoryOf(c.programTypeName) === programType),
    [classrooms, programType]
  );

  const years        = useMemo(() => [...new Set(categoryClassrooms.map((c) => c.year).filter(Boolean))].sort() as number[], [categoryClassrooms]);
  const semesters    = useMemo(() => [...new Set(categoryClassrooms.map((c) => c.semester).filter(Boolean))].sort() as number[], [categoryClassrooms]);
  const generations  = useMemo(() => [...new Set(categoryClassrooms.map((c) => c.generation).filter(Boolean))].sort() as number[], [categoryClassrooms]);

  // Derive scholarship course from className (matches partial SCHOLARSHIP_COURSES name)
  function getCourse(className: string) {
    return SCHOLARSHIP_COURSES.find((c) => className?.toLowerCase().includes(c.toLowerCase())) ?? null;
  }

  // Filtered students
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((s) => {
      const cls = classMap.get(s.className ?? "");

      // Program-category filters (cascade by the selected category)
      if (programType !== "ALL") {
        if (!cls || programCategoryOf(cls.programTypeName) !== programType) return false;
        if (filterShift && cls.shift !== filterShift) return false;
        if (filterGeneration && String(cls.generation) !== filterGeneration) return false;
        if (programType === "SCHOLARSHIP") {
          if (filterCourse && !getCourse(s.className ?? "")?.toLowerCase().includes(filterCourse.toLowerCase())) return false;
        } else {
          // Bachelor / Higher Degree use year + semester structure.
          if (filterYear && String(cls.year) !== filterYear) return false;
          if (filterSemester && String(cls.semester) !== filterSemester) return false;
        }
      }

      // Free-text search across name / studentNo / email / class
      if (q) {
        const haystack = [s.name, s.studentNo, s.email, s.className]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });
  }, [students, classMap, search, programType, filterYear, filterSemester, filterShift, filterGeneration, filterCourse]);

  function resetFilters() {
    setFilterYear(""); setFilterSemester(""); setFilterShift("");
    setFilterGeneration(""); setFilterCourse("");
  }

  const loading = loadingStudents || loadingClassrooms;

  // ── Pagination ────────────────────────────────────────────────────────────
  // Reset to page 1 whenever the result set changes (filters/search) using the
  // adjust-during-render pattern (no set-state-in-effect).
  const [page, setPage] = useState(1);
  const filterKey = `${search}|${programType}|${filterYear}|${filterSemester}|${filterShift}|${filterGeneration}|${filterCourse}`;
  const [prevKey, setPrevKey] = useState(filterKey);
  if (prevKey !== filterKey) {
    setPrevKey(filterKey);
    setPage(1);
  }
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const firstRow = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const lastRow = Math.min(safePage * PAGE_SIZE, filtered.length);

  function openNew() {
    setEditing(null);
    setFormOpen(true);
  }
  function openEdit(s: StudentDto) {
    setEditing({
      id: s.id,
      name: s.name,
      email: s.email ?? "",
      studentNo: s.studentNo ?? "",
      gender: s.gender ?? "",
      phone: s.phone ?? "",
      classId: s.classId ?? null,
      status: s.status ?? "ACTIVE",
    });
    setFormOpen(true);
  }
  async function confirmDelete() {
    if (deletingId == null) return;
    try {
      await deleteStudent(deletingId).unwrap();
      toast.success("Student deleted.");
      setDeletingId(null);
    } catch (e) {
      toast.error(getErrorMessage(e, "Could not delete student."));
    }
  }

  function toggleStudent(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleVisibleStudents(checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const student of paged) {
        if (checked) next.add(student.id); else next.delete(student.id);
      }
      return next;
    });
  }

  async function addSelectedToClass() {
    const classroomId = Number(targetClassId);
    const userIds = [...selectedIds];
    if (!classroomId || userIds.length === 0) return;

    setBulkEnrolling(true);
    try {
      const results = await Promise.allSettled(
        userIds.map((userId) => enrollStudent({ classroomId, userId }).unwrap())
      );
      const failed = results.filter((result) => result.status === "rejected").length;
      const added = userIds.length - failed;

      if (added > 0) toast.success(`Added ${added} student${added === 1 ? "" : "s"} to class.`);
      if (failed > 0) toast.error(`${failed} student${failed === 1 ? "" : "s"} could not be added.`);

      setSelectedIds(new Set());
    } finally {
      setBulkEnrolling(false);
    }
  }

  const selectedVisibleCount = paged.filter((student) => selectedIds.has(student.id)).length;
  const allVisibleSelected = paged.length > 0 && selectedVisibleCount === paged.length;

  return (
    <>
      {/* ── Header: title + count + actions on one clean row ──────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Students</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage and enroll students across all programs.
          </p>
        </div>
        {/*length of students  and register btn*/}
        
      </div>

      {/* Search */}
      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div className="relative max-w-md mb-4">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/60" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, student no., email, class…"
            className="pl-9 pr-9"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-muted-foreground/70 hover:text-foreground hover:bg-muted"
              aria-label="Clear search"
            >
              <XIcon className="size-4" />
            </button>
          )}
        </div>

          <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm text-muted-foreground">
            {filtered.length} of {students.length}
            {selectedIds.size > 0 ? ` · ${selectedIds.size} selected` : ""}
          </span>
          {isAdmin && selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              <select
                value={targetClassId}
                onChange={(event) => setTargetClassId(event.target.value)}
                className="h-9 min-w-48 rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">Select class</option>
                {classrooms.map((classroom) => (
                  <option key={classroom.id} value={classroom.id}>
                    {classroom.className}
                  </option>
                ))}
              </select>
              <Button
                className="gap-1.5"
                onClick={addSelectedToClass}
                disabled={!targetClassId || bulkEnrolling}
              >
                <PlusIcon className="size-4" />
                {bulkEnrolling ? "Adding..." : "Add to class"}
              </Button>
            </div>
          )}
          {isAdmin && (
            <Button className="gap-1.5" onClick={openNew}>
              <PlusIcon className="size-4" />
              Register Student
            </Button>
          )}
          </div>
      </div>
      {/* Program category tabs (Higher Degree / Bachelor / Scholarship) */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {(["ALL", ...PROGRAM_CATEGORIES.map((c) => c.value)] as ("ALL" | ProgramCategory)[]).map((pt) => (
          <button
            key={pt}
            onClick={() => { setProgramType(pt); resetFilters(); }}
            className={`px-4 py-1.5 rounded-full text-base font-medium transition-all border ${
              programType === pt
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:border-primary/50"
            }`}
          >
            {pt === "ALL" ? "All" : PROGRAM_CATEGORY_LABEL[pt]}
          </button>
        ))}
      </div>

      {/* Secondary filters */}
      {programType !== "ALL" && (
        <div className="flex flex-wrap gap-2 mb-6">
          {/* Generation */}
          <FilterSelect
            label="Generation"
            value={filterGeneration}
            onChange={setFilterGeneration}
            options={generations.map((g) => ({ label: `Gen ${g}`, value: String(g) }))}
          />

          {isSemesterCategory(programType) && (
            <>
              <FilterSelect
                label="Year"
                value={filterYear}
                onChange={setFilterYear}
                options={years.map((y) => ({ label: `Year ${y}`, value: String(y) }))}
              />
              <FilterSelect
                label="Semester"
                value={filterSemester}
                onChange={setFilterSemester}
                options={semesters.map((s) => ({ label: `Sem ${s}`, value: String(s) }))}
              />
            </>
          )}

          {programType === "SCHOLARSHIP" && (
            <FilterSelect
              label="Course"
              value={filterCourse}
              onChange={setFilterCourse}
              options={SCHOLARSHIP_COURSES.map((c) => ({ label: c, value: c }))}
            />
          )}

          <FilterSelect
            label="Shift"
            value={filterShift}
            onChange={setFilterShift}
            options={SHIFTS.map((s) => ({ label: SHIFT_LABEL[s], value: s }))}
          />

          {(filterYear || filterSemester || filterShift || filterGeneration || filterCourse) && (
            <Button variant="ghost" size="sm" className="text-muted-foreground/70 hover:text-muted-foreground" onClick={resetFilters}>
              Clear
            </Button>
          )}
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-muted-foreground/70">Loading students…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground/70 bg-card rounded-2xl border border-border">
          <UsersIcon className="size-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No students match your filters.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden bg-card">
          <table className="w-full text-base">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                {isAdmin && (
                  <th className="w-10 px-4 py-3">
                    <Checkbox
                      checked={allVisibleSelected}
                      onCheckedChange={(checked) => toggleVisibleStudents(Boolean(checked))}
                      aria-label="Select visible students"
                    />
                  </th>
                )}
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Student</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground hidden md:table-cell">Class</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground hidden sm:table-cell">Student No.</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Status</th>
                {isAdmin && (
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {paged.map((student, index) => (
                <tr
                  key={student.id}
                  className={`border-b border-border/50 hover:bg-muted/50 transition-colors ${
                    index === paged.length - 1 ? "border-b-0" : ""
                  }`}
                >
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <Checkbox
                        checked={selectedIds.has(student.id)}
                        onCheckedChange={() => toggleStudent(student.id)}
                        aria-label={`Select ${student.name}`}
                      />
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{student.name}</div>
                    <div className="text-sm text-muted-foreground/70">{student.email ?? "—"}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                    {student.className ?? "—"}
                  </td>
                  <td className="hidden px-4 py-3 font-mono text-sm text-muted-foreground sm:table-cell">
                    {student.studentNo ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      className={
                        student.status === "ACTIVE"
                          ? "bg-green-100 text-green-700 hover:bg-green-100"
                          : "bg-muted text-muted-foreground hover:bg-muted"
                      }
                    >
                      {student.status ?? "—"}
                    </Badge>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <ResetDeviceButton studentId={student.id} />
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8">
                              <MoreVerticalIcon className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(student)}>
                              <PencilIcon className="size-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/30"
                              onClick={() => setDeletingId(student.id)}
                            >
                              <TrashIcon className="size-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Pagination ───────────────────────────────────────────────────── */}
      {!loading && filtered.length > 0 && (
        <div className="mt-4 flex items-center justify-between flex-wrap gap-3">
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-medium text-foreground">{firstRow}</span>–
            <span className="font-medium text-foreground">{lastRow}</span> of{" "}
            <span className="font-medium text-foreground">{filtered.length}</span> students
          </p>
          <Pagination page={safePage} totalPages={totalPages} onChange={setPage} />
        </div>
      )}

      <StudentFormDialog
        open={formOpen}
        initial={editing}
        classrooms={classrooms}
        onOpenChange={setFormOpen}
      />

      <AlertDialog open={deletingId != null} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this student?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the student account and unenrolls them from all classes.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}


// ── Pagination control ──────────────────────────────────────────────────────
function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;

  // Compact window of page numbers around the current page.
  const pages: (number | "…")[] = [];
  const push = (p: number | "…") => pages.push(p);
  const window = 1;
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || (p >= page - window && p <= page + window)) {
      push(p);
    } else if (pages[pages.length - 1] !== "…") {
      push("…");
    }
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="icon"
        className="size-8"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
      >
        <ChevronLeftIcon className="size-4" />
      </Button>
      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`gap-${i}`} className="px-1.5 text-sm text-muted-foreground/60">
            …
          </span>
        ) : (
          <Button
            key={p}
            variant={p === page ? "default" : "outline"}
            size="icon"
            className="size-8 text-sm"
            onClick={() => onChange(p)}
            aria-current={p === page ? "page" : undefined}
          >
            {p}
          </Button>
        )
      )}
      <Button
        variant="outline"
        size="icon"
        className="size-8"
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="Next page"
      >
        <ChevronRightIcon className="size-4" />
      </Button>
    </div>
  );
}

// ── Reusable filter select ──────────────────────────────────────────────────
function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { label: string; value: string }[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`appearance-none pl-3 pr-7 py-1.5 text-base rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 ${
          value
            ? "border-primary bg-primary/5 text-primary font-medium"
            : "border-border bg-card text-muted-foreground"
        }`}
      >
        <option value="">{label}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/70" />
    </div>
  );
}
