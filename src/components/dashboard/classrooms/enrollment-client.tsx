"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { SearchIcon, LoaderCircleIcon, UsersIcon, CheckIcon } from "lucide-react";
import { useEnrollStudentMutation, useUnenrollStudentMutation } from "@/store/api/enrollmentApi";

export interface StudentRow {
  id: number;
  studentNo: string;
  name: string;
  email: string;
  className?: string;
  status?: string;
}

interface Props {
  classroomId: number;
  classroomName: string;
  initialEnrolled: StudentRow[];
  allStudents: StudentRow[];
}

export function EnrollmentClient({
  classroomId,
  classroomName,
  initialEnrolled,
  allStudents,
}: Props) {
  const router = useRouter();
  const [enrollStudent] = useEnrollStudentMutation();
  const [unenrollStudent] = useUnenrollStudentMutation();

  const initiallyEnrolledIds = useMemo(
    () => new Set(initialEnrolled.map((s) => s.id)),
    [initialEnrolled]
  );

  // selected = current "draft" state. starts as the already-enrolled set.
  const [selected, setSelected] = useState<Set<number>>(initiallyEnrolledIds);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allStudents;
    return allStudents.filter((s) =>
      [s.name, s.studentNo, s.email, s.className]
        .filter(Boolean).join(" ").toLowerCase().includes(q)
    );
  }, [query, allStudents]);

  const toAdd    = useMemo(() => [...selected].filter((id) => !initiallyEnrolledIds.has(id)), [selected, initiallyEnrolledIds]);
  const toRemove = useMemo(() => [...initiallyEnrolledIds].filter((id) => !selected.has(id)), [selected, initiallyEnrolledIds]);
  const dirty    = toAdd.length > 0 || toRemove.length > 0;

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function reset() {
    setSelected(new Set(initiallyEnrolledIds));
  }

  async function save() {
    setSaving(true);
    try {
      const results = await Promise.allSettled([
        ...toAdd.map((userId) => enrollStudent({ classroomId, userId }).unwrap()),
        ...toRemove.map((userId) => unenrollStudent({ classroomId, userId }).unwrap()),
      ]);
      const failed = results.filter((r) => r.status === "rejected").length;
      if (failed > 0) {
        toast.error(`${failed} change${failed === 1 ? "" : "s"} failed to save.`);
      }
      toast.success(
        `${toAdd.length ? `Added ${toAdd.length}` : ""}` +
        `${toAdd.length && toRemove.length ? " · " : ""}` +
        `${toRemove.length ? `Removed ${toRemove.length}` : ""}` +
        ` student${toAdd.length + toRemove.length === 1 ? "" : "s"} from ${classroomName}.`
      );
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Search + summary */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/60" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search students by name, student no., email…"
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Badge variant="secondary" className="gap-1">
            <UsersIcon className="size-3" />
            {selected.size} selected
          </Badge>
          {dirty && (
            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200">
              {toAdd.length > 0 && `+${toAdd.length}`}
              {toAdd.length > 0 && toRemove.length > 0 && " / "}
              {toRemove.length > 0 && `−${toRemove.length}`}
              {" pending"}
            </Badge>
          )}
        </div>
      </div>

      {/* Student list */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="max-h-[60vh] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 sticky top-0 z-10">
              <tr>
                <th className="w-10 px-3 py-2.5 text-left"></th>
                <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground">Student</th>
                <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground hidden sm:table-cell">No.</th>
                <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground hidden md:table-cell">Class</th>
                <th className="px-3 py-2.5 text-right font-semibold text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-muted-foreground/70">
                    No students match your search.
                  </td>
                </tr>
              ) : filtered.map((s) => {
                const isSel = selected.has(s.id);
                const wasEnrolled = initiallyEnrolledIds.has(s.id);
                return (
                  <tr
                    key={s.id}
                    onClick={() => toggle(s.id)}
                    className={`border-t border-border/50 cursor-pointer hover:bg-muted/40 transition-colors ${
                      isSel ? "bg-primary/5" : ""
                    }`}
                  >
                    <td className="px-3 py-2.5">
                      <Checkbox checked={isSel} aria-label={`Select ${s.name}`} />
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="font-medium text-foreground">{s.name}</div>
                      <div className="text-xs text-muted-foreground">{s.email}</div>
                    </td>
                    <td className="px-3 py-2.5 hidden sm:table-cell font-mono text-xs text-muted-foreground">
                      {s.studentNo}
                    </td>
                    <td className="px-3 py-2.5 hidden md:table-cell text-muted-foreground">
                      {s.className ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {wasEnrolled && isSel && (
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400 gap-1">
                          <CheckIcon className="size-3" /> Enrolled
                        </Badge>
                      )}
                      {!wasEnrolled && isSel && (
                        <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
                          + Pending
                        </Badge>
                      )}
                      {wasEnrolled && !isSel && (
                        <Badge className="bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400">
                          − Will remove
                        </Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Save bar */}
      <div className="flex items-center justify-end gap-2 sticky bottom-4 bg-background/80 backdrop-blur p-3 rounded-xl border border-border">
        <Button variant="outline" onClick={reset} disabled={!dirty || saving}>
          Reset
        </Button>
        <Button onClick={save} disabled={!dirty || saving}>
          {saving && <LoaderCircleIcon className="size-4 animate-spin mr-2" />}
          Save changes
        </Button>
      </div>
    </div>
  );
}
