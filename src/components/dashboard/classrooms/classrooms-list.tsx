"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  BookOpenIcon,
  SearchIcon,
  XIcon,
  PlusIcon,
  MoreVerticalIcon,
  PencilIcon,
  TrashIcon,
  UsersIcon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ClassCard } from "@/components/ui/class-card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { ClassroomFormDialog, type ClassroomFormValue } from "@/components/classroom-form-dialog";
import { api } from "@/lib/api/api-client";

export interface ClassroomItem {
  id: number;
  className: string;
  classCode: string;
  programTypeName: string;
  generation: number;
  year: number | null;
  semester: number | null;
  shift: string;
  academicYear: number;
  startDate: string;
  endDate: string;
  lab?: string | null;
  telegramChatId?: string | null;
  telegramAlertEnabled?: boolean | null;
  status: boolean;
}

const SHIFT_LABEL: Record<string, string> = {
  MORNING:   "Morning",
  AFTERNOON: "Afternoon",
  EVENING:   "Evening",
};

interface Props {
  classrooms: ClassroomItem[];
  emptyMessage: string;
  /** When true, show New / Edit / Delete actions. */
  canManage?: boolean;
}

export function ClassroomsList({ classrooms, emptyMessage, canManage = false }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ClassroomItem | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return classrooms;
    return classrooms.filter((c) =>
      [c.className, c.classCode, c.programTypeName, c.shift,
        `gen ${c.generation}`, `generation ${c.generation}`,
        c.year != null ? `year ${c.year}` : "",
        c.semester != null ? `sem ${c.semester}` : ""]
        .filter(Boolean).join(" ").toLowerCase().includes(q)
    );
  }, [query, classrooms]);

  const grouped = useMemo(() => {
    return filtered.reduce<Record<string, ClassroomItem[]>>((acc, c) => {
      const key = c.programTypeName ?? "Other";
      (acc[key] ??= []).push(c);
      return acc;
    }, {});
  }, [filtered]);

  const groupNames = Object.keys(grouped).sort();

  function openNew() {
    setEditing(null);
    setFormOpen(true);
  }
  function openEdit(c: ClassroomItem) {
    setEditing(c);
    setFormOpen(true);
  }
  async function confirmDelete() {
    if (deletingId == null) return;
    try {
      await api.del(`/classrooms/${deletingId}`);
      toast.success("Class deleted.");
      setDeletingId(null);
      startTransition(() => router.refresh());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Search + actions */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="relative max-w-md flex-1 min-w-50">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/60" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by class name, code, program, shift, generation…"
            className="pl-9 pr-9"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-muted-foreground/70 hover:text-foreground hover:bg-muted"
              aria-label="Clear search"
            >
              <XIcon className="size-4" />
            </button>
          )}
        </div>
        {canManage && (
          <Button onClick={openNew} className="gap-1.5">
            <PlusIcon className="size-4" /> New Class
          </Button>
        )}  
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground bg-card rounded-2xl border">
          <BookOpenIcon className="size-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">
            {query ? `No classes match "${query}"` : emptyMessage}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {groupNames.map((group) => (
            <section key={group}>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                {group}
                <span className="ml-2 text-xs font-normal text-muted-foreground/60">
                  ({grouped[group].length})
                </span>
              </h2>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-5">
                {grouped[group].map((c) => (
                  <div key={c.id} className="relative group">
                    <Link href={`/dashboard/classrooms/${c.id}`} className="block hover:scale-[1.01] transition-transform">
                      <ClassCard
                        title={c.programTypeName ?? "Class"}
                        status={c.status ? "Active" : "Inactive"}
                        classNameValue={c.className}
                        shift={SHIFT_LABEL[c.shift] ?? c.shift ?? "—"}
                        time={`${c.startDate ?? "?"} – ${c.endDate ?? "?"}`}
                        lab={c.lab ?? undefined}
                        students=""
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

                    {canManage && (
                      <div className="absolute top-3 right-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                            >
                              <MoreVerticalIcon className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(c)}>
                              <PencilIcon className="size-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/dashboard/classrooms/${c.id}/enroll`)}>
                              <UsersIcon className="size-4 mr-2" /> Enroll students
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/30"
                              onClick={() => setDeletingId(c.id)}
                            >
                              <TrashIcon className="size-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Create / Edit dialog */}
      <ClassroomFormDialog
        open={formOpen}
        initial={editing as ClassroomFormValue | null}
        onOpenChange={setFormOpen}
        onSaved={() => startTransition(() => router.refresh())}
      />

      {/* Delete confirm */}
      <AlertDialog open={deletingId != null} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this class?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the class and unlinks any enrolled students.
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
    </div>
  );
}
