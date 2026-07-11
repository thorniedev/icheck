"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThermometerSnowflake, FlameIcon, LoaderCircleIcon } from "lucide-react";
import { api } from "@/lib/api/api-client";
import { getErrorMessage } from "@/lib/api/error-utils";

interface Props {
  /** Per-class freeze when set. Omit for the whole-school (GLOBAL) freeze. */
  classroomId?: number;
  className?: string;
}

/**
 * Date-range freeze dialog. Freezes attendance for one or more days — for a
 * single class (classroomId set) or the whole school (omitted). Posts to
 * `/calendar/freeze`, which creates a HOLIDAY for each day and cancels any
 * session already generated in scope. "Unfreeze" removes those days.
 */
export function FreezeClassDialog({ classroomId, className }: Props) {
  const router = useRouter();
  const isGlobal = classroomId == null;
  const scope = isGlobal ? "GLOBAL" : "CLASSROOM";

  const today = new Date().toISOString().slice(0, 10);
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState<"freeze" | "unfreeze" | null>(null);

  async function run(action: "freeze" | "unfreeze") {
    if (!from || !to) {
      toast.error("Pick both a start and end date.");
      return;
    }
    if (to < from) {
      toast.error("End date can't be before start date.");
      return;
    }
    setBusy(action);
    try {
      await api.post(`/calendar/${action}`, {
        from,
        to,
        scope,
        classroomId: isGlobal ? null : classroomId,
        label: label.trim() || (isGlobal ? "School holiday" : `Frozen: ${className ?? "class"}`),
      });
      const days = Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000) + 1;
      toast.success(
        action === "freeze"
          ? `${isGlobal ? "All classes" : className ?? "Class"} frozen for ${days} day${days === 1 ? "" : "s"}.`
          : `Unfrozen ${isGlobal ? "all classes" : className ?? "class"} for that range.`,
      );
      setOpen(false);
      router.refresh();
    } catch (e) {
      toast.error(getErrorMessage(e, "Could not change freeze state."));
    } finally {
      setBusy(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="p-5 gap-1.5">
          <ThermometerSnowflake className="size-4" /> {isGlobal ? "Freeze All" : "Freeze"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isGlobal ? "Freeze Attendance (whole school)" : `Freeze ${className ?? "this class"}`}
          </DialogTitle>
          <DialogDescription>
            Pick a date range to pause attendance. No sessions are generated and
            check-ins are rejected on those days; already-created sessions are
            cancelled. Use the same range with Unfreeze to undo.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="From" required>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </Field>
            <Field label="To" required>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </Field>
          </div>
          <Field label="Reason / label">
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Public holiday, exam week…"
            />
          </Field>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            variant="outline"
            onClick={() => run("unfreeze")}
            disabled={busy != null}
            className="gap-1.5"
          >
            {busy === "unfreeze" ? <LoaderCircleIcon className="size-4 animate-spin" /> : <FlameIcon className="size-4" />}
            Unfreeze
          </Button>
          <Button onClick={() => run("freeze")} disabled={busy != null} className="gap-1.5">
            {busy === "freeze" ? <LoaderCircleIcon className="size-4 animate-spin" /> : <ThermometerSnowflake className="size-4" />}
            Freeze Range
          </Button>
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
