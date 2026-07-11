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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LayersIcon, LoaderCircleIcon } from "lucide-react";
import { api } from "@/lib/api/api-client";
import { getErrorMessage } from "@/lib/api/error-utils";
import { useGetTeachersQuery } from "@/store/api/userApi";

interface ClassroomOpt { id: number; className: string; }

const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

/**
 * Admin one-click ITE schedule preset. Backend `/schedules/ite-preset` creates
 * both attendance slots (13:30–17:30 and 18:00–20:30) for the chosen class /
 * teacher / day. Saves the admin from entering two near-identical rows.
 */
export function ItePresetInner({
  classrooms = [],
}: {
  classrooms?: ClassroomOpt[];
}) {
  const router = useRouter();
  const { data: teachers = [] } = useGetTeachersQuery();

  const [open, setOpen] = useState(false);
  const [classId, setClassId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [day, setDay] = useState("MONDAY");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!classId || !teacherId) {
      toast.error("Class and teacher are required.");
      return;
    }
    setSaving(true);
    try {
      await api.post("/schedules/ite-preset", {
        classId: Number(classId),
        teacherId: Number(teacherId),
        dayOfWeek: day,
      });
      toast.success("ITE slots created (13:30–17:30 and 18:00–20:30).");
      setOpen(false);
      router.refresh();
    } catch (e) {
      toast.error(getErrorMessage(e, "Could not create ITE slots."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <LayersIcon className="size-4" /> ITE Preset
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create ITE Schedule (2 slots)</DialogTitle>
          <DialogDescription>
            Generates both daily attendance slots at once: 1:30–5:30 PM and
            6:00–8:30 PM for the selected class.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <Field label="Class" required>
            <Select value={classId} onValueChange={setClassId}>
              <SelectTrigger><SelectValue placeholder="Pick class" /></SelectTrigger>
              <SelectContent>
                {classrooms.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.className}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Teacher" required>
            <Select value={teacherId} onValueChange={setTeacherId}>
              <SelectTrigger><SelectValue placeholder="Pick teacher" /></SelectTrigger>
              <SelectContent>
                {teachers.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Day" required>
            <Select value={day} onValueChange={setDay}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DAYS.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d.charAt(0) + d.slice(1).toLowerCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gap-1.5">
            {saving ? <LoaderCircleIcon className="size-4 animate-spin" /> : null}
            Create Both Slots
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
