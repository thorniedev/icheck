"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  SearchIcon,
  XIcon,
  GraduationCapIcon,
  MoreVerticalIcon,
  PencilIcon,
  TrashIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react";
import {
  useGetTeachersQuery,
  useDeleteTeacherMutation,
  type TeacherDto,
} from "@/store/api/userApi";
import {
  TeacherFormDialog,
  type TeacherFormValue,
} from "@/components/teacher-form-dialog";
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

/**
 * Teacher list + full CRUD UI. Used from the dedicated /teachers admin route
 * and from the Users page (Teachers view) — keeping a single implementation so
 * behaviour stays in sync across both entry points.
 */
export function TeachersView() {
  const { data: teachers = [], isLoading } = useGetTeachersQuery();
  const [deleteTeacher] = useDeleteTeacherMutation();

  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TeacherFormValue | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return teachers;
    return teachers.filter((t) =>
      [t.name, t.email, t.specialization]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [search, teachers]);

  // Pagination — reset to page 1 when the search changes (adjust-during-render).
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);
  const [prevSearch, setPrevSearch] = useState(search);
  if (prevSearch !== search) {
    setPrevSearch(search);
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
  function openEdit(t: TeacherDto) {
    setEditing({
      id: t.id,
      name: t.name,
      email: t.email ?? "",
      phone: t.phone ?? "",
      specialization: t.specialization ?? "",
    });
    setFormOpen(true);
  }
  async function confirmDelete() {
    if (deletingId == null) return;
    try {
      await deleteTeacher(deletingId).unwrap();
      toast.success("Teacher deleted.");
      setDeletingId(null);
    } catch (e) {
      toast.error(getErrorMessage(e, "Could not delete teacher."));
    }
  }

  return (
    <>
      {/* Search */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="relative flex gap-4 w-100 mb-4">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/60" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, specialization…"
            className="px-9 w-full"
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

        <div className="flex items-center justify-end mb-4 flex-wrap gap-3">
          <span className="text-sm text-muted-foreground">
            {filtered.length} of {teachers.length}
          </span>
          <Button className="gap-1.5" onClick={openNew}>
            Register Teacher
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground/70">
          Loading teachers…
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground/70 bg-card rounded-2xl border border-border">
          <GraduationCapIcon className="size-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No teachers match your search.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden bg-card">
          <table className="w-full text-base">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">
                  Teacher
                </th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground hidden sm:table-cell">
                  Phone
                </th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground hidden md:table-cell">
                  Specialization
                </th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">
                  Status
                </th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {paged.map((teacher, index) => (
                <tr
                  key={teacher.id}
                  className={`border-b border-border/50 hover:bg-muted/50 transition-colors ${
                    index === paged.length - 1 ? "border-b-0" : ""
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">
                      {teacher.name}
                    </div>
                    <div className="text-sm text-muted-foreground/70">
                      {teacher.email ?? "—"}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                    {teacher.phone ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                    {teacher.specialization ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      className={
                        teacher.status === "ACTIVE"
                          ? "bg-green-100 text-green-700 hover:bg-green-100"
                          : "bg-muted text-muted-foreground hover:bg-muted"
                      }
                    >
                      {teacher.status ?? "—"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <MoreVerticalIcon className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(teacher)}>
                          <PencilIcon className="size-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/30"
                          onClick={() => setDeletingId(teacher.id)}
                        >
                          <TrashIcon className="size-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!isLoading && filtered.length > 0 && totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between flex-wrap gap-3">
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-medium text-foreground">{firstRow}</span>–
            <span className="font-medium text-foreground">{lastRow}</span> of{" "}
            <span className="font-medium text-foreground">{filtered.length}</span> teachers
          </p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="size-8" onClick={() => setPage(safePage - 1)} disabled={safePage <= 1} aria-label="Previous page">
              <ChevronLeftIcon className="size-4" />
            </Button>
            <span className="px-2 text-sm text-muted-foreground">{safePage} / {totalPages}</span>
            <Button variant="outline" size="icon" className="size-8" onClick={() => setPage(safePage + 1)} disabled={safePage >= totalPages} aria-label="Next page">
              <ChevronRightIcon className="size-4" />
            </Button>
          </div>
        </div>
      )}

      <TeacherFormDialog
        open={formOpen}
        initial={editing}
        onOpenChange={setFormOpen}
      />

      <AlertDialog
        open={deletingId != null}
        onOpenChange={(o) => !o && setDeletingId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this teacher?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the teacher account. Schedules assigned
              to this teacher will need to be reassigned. This action cannot be
              undone.
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
