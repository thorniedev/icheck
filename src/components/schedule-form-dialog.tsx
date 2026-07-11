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
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoaderCircleIcon } from "lucide-react";
import { api } from "@/lib/api/api-client";
import { useGetTeachersQuery } from "@/store/api/userApi";
import { SingleCombobox } from "@/components/ui/multi-combobox";

const DAYS = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
] as const;

export interface ScheduleFormValue {
  id?: number;
  classId?: number;
  className: string;
  teacherId?: number;
  teacherName: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  slot: number;
  attendanceRequired?: boolean;
  status: boolean;
}

const empty: ScheduleFormValue = {
  classId: undefined,
  className: "",
  teacherId: undefined,
  teacherName: "",
  dayOfWeek: "MONDAY",
  startTime: "08:00",
  endTime: "10:00",
  slot: 1,
  attendanceRequired: true,
  status: true,
};

interface ClassroomOpt {
  id: number;
  className: string;
}

interface Props {
  open: boolean;
  initial?: ScheduleFormValue | null;
  classrooms?: ClassroomOpt[];
  onOpenChange: (o: boolean) => void;
}

export function ScheduleFormDialog({
  open,
  initial,
  classrooms = [],
  onOpenChange,
}: Props) {
  const router = useRouter();
  const editing = !!initial?.id;
  const { data: teachers = [], isLoading: loadingTeachers } =
    useGetTeachersQuery();
  const [form, setForm] = useState<ScheduleFormValue>(empty);
  const [saving, setSaving] = useState(false);

  // Reset the form whenever the dialog transitions to open (adjusting state
  // during render avoids the cascading-render set-state-in-effect pitfall).
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setForm(initial ? { ...empty, ...initial } : empty);
  }

  function patch<K extends keyof ScheduleFormValue>(
    k: K,
    v: ScheduleFormValue[K],
  ) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function isIteClassName(className: string) {
    return className.toUpperCase().includes("ITE");
  }

  function applySlot(slot: number) {
    patch("slot", slot);
    if (!isIteClassName(form.className)) return;
    if (slot === 1) {
      patch("startTime", "13:30");
      patch("endTime", "17:30");
    } else if (slot === 2) {
      patch("startTime", "18:00");
      patch("endTime", "20:30");
    }
  }

  async function handleSave() {
    if (!form.classId || !form.teacherId) {
      toast.error("Class and teacher are required.");
      return;
    }
    if (form.startTime >= form.endTime) {
      toast.error("End time must be after start time.");
      return;
    }
    setSaving(true);
    try {
      const body = {
        classId: form.classId,
        teacherId: form.teacherId,
        dayOfWeek: form.dayOfWeek,
        startTime:
          form.startTime.length === 5 ? form.startTime + ":00" : form.startTime,
        endTime:
          form.endTime.length === 5 ? form.endTime + ":00" : form.endTime,
        slot: Number(form.slot),
        attendanceRequired: form.attendanceRequired ?? true,
      };
      if (editing) {
        await api.put(`/schedules/${form.id}`, body);
        // Active/Inactive status isn't part of ScheduleRequest — toggle separately.
        if (form.status !== initial?.status) {
          await api.patch(
            `/schedules/${form.id}/status?active=${form.status}`,
            undefined,
          );
        }
        toast.success("Schedule updated.");
      } else {
        const created = await api.post(`/schedules`, body);
        const newId = (created as { payload?: { id?: number } } | null)?.payload
          ?.id;
        if (!form.status && newId) {
          await api.patch(`/schedules/${newId}/status?active=false`, undefined);
        }
        toast.success("Schedule created.");
      }
      onOpenChange(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit Schedule" : "Add Schedule"}
          </DialogTitle>
          <DialogDescription>
            Recurring weekly slot for a class.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Class" required>
            <SingleCombobox
              options={classrooms.map((c) => ({ value: String(c.id), label: c.className }))}
              value={form.classId ? String(form.classId) : null}
              onChange={(v) => {
                const c = classrooms.find((cl) => cl.id === Number(v));
                patch("classId", v ? Number(v) : undefined);
                patch("className", c?.className ?? "");
                if (c?.className && isIteClassName(c.className)) {
                  patch("slot", 1);
                  patch("startTime", "13:30");
                  patch("endTime", "17:30");
                }
              }}
              placeholder="Select class"
              searchPlaceholder="Search class…"
              emptyText="No classes found."
            />
          </Field>

          <Field label="Teacher" required>
            <SingleCombobox
              options={teachers.map((t) => ({ value: String(t.id), label: t.name }))}
              value={form.teacherId ? String(form.teacherId) : null}
              onChange={(v) => {
                const t = teachers.find((teacher) => teacher.id === Number(v));
                patch("teacherId", v ? Number(v) : undefined);
                patch("teacherName", t?.name ?? "");
              }}
              placeholder={loadingTeachers ? "Loading teachers…" : "Select teacher"}
              searchPlaceholder="Search teacher…"
              emptyText="No teachers found."
              disabled={loadingTeachers}
            />
          </Field>

          <Field label="Day">
            <Select
              value={form.dayOfWeek}
              onValueChange={(v) => patch("dayOfWeek", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DAYS.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d.charAt(0) + d.slice(1).toLowerCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="col-span-2 grid grid-cols-2 gap-3">
            <Field label="Start Time">
              <Input
                type="time"
                value={form.startTime}
                onChange={(e) => patch("startTime", e.target.value)}
              />
            </Field>

            <Field label="End Time">
              <Input
                type="time"
                value={form.endTime}
                onChange={(e) => patch("endTime", e.target.value)}
              />
            </Field>
          </div>

          <Field label="Slot">
            <Input
              type="number"
              min={1}
              max={isIteClassName(form.className) ? 2 : 1}
              value={form.slot}
              onChange={(e) => applySlot(Number(e.target.value))}
            />
          </Field>
          <Field label="Status">
            <Select
              value={form.status ? "active" : "inactive"}
              onValueChange={(v) => patch("status", v === "active")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && (
              <LoaderCircleIcon className="size-4 animate-spin mr-2" />
            )}
            {editing ? "Save Changes" : "Create"}
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
