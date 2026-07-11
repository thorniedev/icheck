"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoaderCircleIcon } from "lucide-react";
import { useUser } from "@/components/user-provider";
import { api } from "@/lib/api/api-client";
import { getErrorMessage } from "@/lib/api/error-utils";

export interface AmendmentDialogStudent {
  id: number | string;
  name: string;
  /** Current status from the SSR roster (lower-case "present", "late",
   *  "pending", …). Used to seed each row's select and to skip rows where the
   *  teacher made no change at submit time. */
  currentStatus?: string;
}

interface Props {
  mode?: "teacher" | "admin";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  students: AmendmentDialogStudent[];
  sessionId: number | null;
  onSaved?: () => void;
}

type Stage = "reason" | "list";

const STATUS_OPTIONS = [
  { value: "PRESENT",  label: "Present" },
  { value: "LATE",     label: "Late" },
  { value: "LATE_OUT", label: "Late Out" },
  { value: "ABSENT",   label: "Absent" },
];

/** The student's REAL current attendance status for diffing — returns "" for
 *  pending/active/none, so that picking any status counts as a real change
 *  (the previous version fell back to "PRESENT", which made "mark present"
 *  look like a no-op and silently saved nothing). */
function beforeStatus(raw?: string): string {
  const up = (raw ?? "").toUpperCase();
  return STATUS_OPTIONS.some((o) => o.value === up) ? up : "";
}

/** Initial value for a row's select — the real status if known, else default
 *  to Present (the common "took attendance on paper" case). Because the diff
 *  uses beforeStatus(), an unknown→Present row is still flagged as changed. */
function seedStatus(raw?: string): string {
  return beforeStatus(raw) || "PRESENT";
}

/** Colour for the active (selected) status pill. */
function statusActiveClass(value: string): string {
  switch (value) {
    case "PRESENT":  return "border-green-600 bg-green-600 text-white";
    case "LATE":     return "border-amber-500 bg-amber-500 text-white";
    case "LATE_OUT": return "border-orange-500 bg-orange-500 text-white";
    case "ABSENT":   return "border-red-600 bg-red-600 text-white";
    default:         return "border-primary bg-primary text-primary-foreground";
  }
}

/**
 * Teacher manual amendment — two-stage flow:
 *
 *   Stage 1 ("reason"): teacher types ONE reason that will be attached to
 *     every status change in this batch (e.g. "QR was offline, attendance
 *     taken from the paper sheet").
 *
 *   Stage 2 ("list"): full student roster with a per-row status select. The
 *     teacher tweaks whichever rows changed, leaves the rest, and clicks Save.
 *     Only rows whose status differs from the SSR snapshot get a backend call;
 *     unchanged rows are skipped so the audit log stays clean.
 *
 * Each row that DID change posts to /amendments/teacher-amend-by-student,
 * which:
 *   - creates the Attendance row if the student never scanned,
 *   - flips the status to the chosen value,
 *   - writes an APPROVED Amendment for the audit trail,
 *   - notifies the student,
 *   - broadcasts a live update.
 */
export function AmendmentDialog({
  mode = "teacher",
  open,
  onOpenChange,
  students,
  sessionId,
  onSaved,
}: Props) {
  const user = useUser();

  const [stage, setStage] = useState<Stage>("reason");
  const [reason, setReason] = useState("");
  // Map keyed by `${id}` so we don't depend on numeric vs string id consistency.
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Reset whenever the dialog reopens — adjusting state during render avoids
  // the cascading-render set-state-in-effect rule.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setStage("reason");
      setReason("");
      const seed: Record<string, string> = {};
      for (const s of students) seed[String(s.id)] = seedStatus(s.currentStatus);
      setDrafts(seed);
    }
  }

  function advanceToList() {
    if (!sessionId) {
      toast.error("No session is open for this class right now.");
      return;
    }
    if (reason.trim().length < 3) {
      toast.error("Reason is required (at least 3 characters).");
      return;
    }
    setStage("list");
  }

  function patchDraft(id: string | number, status: string) {
    setDrafts((prev) => ({ ...prev, [String(id)]: status }));
  }

  async function handleSave() {
    if (!sessionId) {
      toast.error("No session is open for this class right now.");
      return;
    }
    if (mode === "teacher" && !user?.id) {
      toast.error("Could not identify the current teacher.");
      return;
    }

    // Diff against the SSR snapshot — skip rows the teacher didn't touch so
    // we don't spam the audit log with no-op amendments.
    const changed = students.filter((s) => {
      const next = drafts[String(s.id)];
      const before = beforeStatus(s.currentStatus);
      return next && next !== before;
    });

    if (changed.length === 0) {
      toast.info("No status changes to save.");
      onOpenChange(false);
      return;
    }

    setSaving(true);
    try {
      // Fire serially so the backend write order matches the row order — easier
      // for an admin to follow in the amendment timeline later.
      const failures: string[] = [];
      for (const s of changed) {
        try {
          if (mode === "admin") {
            await api.post("/attendances/admin-override-by-student", {
              studentId: Number(s.id),
              sessionId,
              status: drafts[String(s.id)],
              remark: reason.trim(),
            });
          } else {
            await api.post("/amendments/teacher-amend-by-student", {
              teacherId: Number(user?.id),
              studentId: Number(s.id),
              sessionId,
              newStatus: drafts[String(s.id)],
              reason: reason.trim(),
            });
          }
        } catch (e) {
          failures.push(`${s.name}: ${getErrorMessage(e, "save failed")}`);
        }
      }

      if (failures.length === 0) {
        toast.success(`Updated ${changed.length} student${changed.length === 1 ? "" : "s"}.`);
        onOpenChange(false);
        onSaved?.();
      } else if (failures.length < changed.length) {
        toast.warning(
          `Saved ${changed.length - failures.length}, but ${failures.length} failed.`,
          { description: failures.slice(0, 3).join("\n") },
        );
        onSaved?.();
      } else {
        toast.error("Could not save any amendment.", {
          description: failures.slice(0, 3).join("\n"),
        });
      }
    } finally {
      setSaving(false);
    }
  }

  const changedCount = students.reduce((acc, s) => {
    const next = drafts[String(s.id)];
    const before = beforeStatus(s.currentStatus);
    return next && next !== before ? acc + 1 : acc;
  }, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={stage === "list" ? "sm:max-w-2xl" : "sm:max-w-md"}>
        <DialogHeader>
          <DialogTitle>
            {stage === "reason"
              ? mode === "admin" ? "Edit Reason" : "Amendment Reason"
              : "Edit Attendance"}
          </DialogTitle>
          <DialogDescription>
            {stage === "reason"
              ? mode === "admin"
                ? "Give one reason for this admin override. No amendment request is created."
                : "Give one reason for this batch of changes — it gets attached to every status you adjust on the next screen."
              : `Adjust each student's status, then save. Reason: “${reason}”.`}
          </DialogDescription>
        </DialogHeader>

        {stage === "reason" ? (
          <div className="grid gap-3">
            <Field label="Reason" required>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. QR was offline — attendance taken from paper sheet"
                autoFocus
              />
              <p className="text-[11px] text-muted-foreground/70">
                Stored on every amendment row so admins can audit later.
              </p>
            </Field>
          </div>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto rounded-lg border border-border/60 divide-y divide-border/40">
            {students.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                No students in this class.
              </div>
            ) : (
              students.map((s) => {
                const draft = drafts[String(s.id)] ?? seedStatus(s.currentStatus);
                const before = beforeStatus(s.currentStatus);
                const changed = draft !== before;
                return (
                  <div
                    key={s.id}
                    className={`px-3 py-2.5 ${
                      changed ? "bg-amber-50/40 dark:bg-amber-950/20" : ""
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{s.name}</p>
                        <p className="text-[11px] text-muted-foreground/70">
                          Current: {s.currentStatus ?? "pending"}
                          {changed && (
                            <span className="ml-1 text-amber-600 dark:text-amber-400">
                              → {STATUS_OPTIONS.find((o) => o.value === draft)?.label}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    {/* Click a status to change it (no dropdown). */}
                    <div className="flex flex-wrap gap-1.5">
                      {STATUS_OPTIONS.map((o) => {
                        const active = draft === o.value;
                        return (
                          <button
                            key={o.value}
                            type="button"
                            onClick={() => patchDraft(s.id, o.value)}
                            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                              active
                                ? statusActiveClass(o.value)
                                : "border-border bg-card text-muted-foreground hover:border-primary/40"
                            }`}
                          >
                            {o.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          {stage === "reason" ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={advanceToList}
                disabled={reason.trim().length < 3 || !sessionId}
              >
                Next: Edit Students
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => setStage("reason")}
                disabled={saving}
              >
                Back
              </Button>
              <Button onClick={handleSave} disabled={saving} className="gap-1.5">
                {saving ? <LoaderCircleIcon className="size-4 animate-spin" /> : null}
                Save Changes
                {changedCount > 0 ? (
                  <span className="ml-1 text-xs opacity-80">({changedCount})</span>
                ) : null}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
}
