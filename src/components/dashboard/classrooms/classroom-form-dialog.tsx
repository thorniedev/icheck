"use client";

import { useState } from "react";
import { toast } from "sonner";
import { QRCodeCanvas } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import {
  CheckCircle2Icon,
  DownloadIcon,
  LoaderCircleIcon,
  MessageCircleIcon,
  QrCodeIcon,
  SendIcon,
  UsersIcon,
} from "lucide-react";
import { todayIso } from "@/lib/utils/school-time";
import {
  useCreateClassroomMutation,
  useTestClassroomTelegramMutation,
  useUpdateClassroomMutation,
} from "@/store/api/attendanceApi";
import { useGetClassroomStaticQrMutation } from "@/store/api/qrApi";
import { useGetProgramTypesQuery } from "@/store/api/programTypeApi";

export interface ClassroomFormValue {
  id?: number;
  className: string;
  classCode: string;
  programTypeName: string;
  generation: number;
  year?: number | null;
  semester?: number | null;
  shift: string;
  academicYear: number;
  startDate: string;
  endDate: string;
  /** Lab/room name, e.g. "Lab DevOps", "Lab AI". */
  lab?: string | null;
  telegramChatId?: string | null;
  telegramAlertEnabled?: boolean | null;
  status: boolean;
}

const SHIFTS  = ["MORNING", "AFTERNOON", "EVENING"];

/** IT Expert (ITE) runs on fixed time slots, not morning/afternoon shifts —
 *  so the Shift field is blanked/disabled and sent as null for ITE classes. */
function isNoShiftProgram(name?: string | null) {
  return /it\s*expert/i.test(name ?? "") || /\bite\b/i.test(name ?? "");
}

// Common school lab/room names — admin can also type a custom one.
const LABS = [
  "Lab DevOps",
  "Lab Data Analytics",
  "Lab AI",
  "Lab Fullstack",
  "Lab BlockChain",
  "Lab Mobile",
];

interface Props {
  open: boolean;
  initial?: ClassroomFormValue | null;
  onOpenChange: (o: boolean) => void;
  onSaved?: () => void;
}

const empty: ClassroomFormValue = {
  className: "",
  classCode: "",
  // Empty by default — the Select shows a placeholder and the user must pick
  // one of the live program types (the old "Bachelor" literal no longer
  // matches the seeded name "Bachelor's Degree").
  programTypeName: "",
  generation: 1,
  year: 1,
  semester: 1,
  shift: "MORNING",
  academicYear: new Date().getFullYear(),
  // school local date, not UTC — same reason as schedule/page.tsx
  startDate: todayIso(),
  endDate: todayIso(),
  lab: "",
  telegramChatId: "",
  telegramAlertEnabled: false,
  status: true,
};

export function ClassroomFormDialog({ open, initial, onOpenChange, onSaved }: Props) {
  const editing = !!initial?.id;
  const [form, setForm] = useState<ClassroomFormValue>(initial ? { ...empty, ...initial } : empty);
  const [generateStaticQr, setGenerateStaticQr] = useState(true);
  const [createdQr, setCreatedQr] = useState<{ id: number; className: string; codeValue: string } | null>(null);
  const [generatingQr, setGeneratingQr] = useState(false);
  const [createClassroom, { isLoading: creating }] = useCreateClassroomMutation();
  const [updateClassroom, { isLoading: updating }] = useUpdateClassroomMutation();
  const [testTelegram, { isLoading: testingTelegram }] = useTestClassroomTelegramMutation();
  const [getClassroomStaticQr] = useGetClassroomStaticQrMutation();
  const { data: programTypes = [] } = useGetProgramTypesQuery();
  const saving = creating || updating || generatingQr || testingTelegram;

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setForm(initial ? { ...empty, ...initial } : empty);
      setGenerateStaticQr(true);
      setCreatedQr(null);
    }
    onOpenChange(nextOpen);
  }

  // Year/Semester only apply to SEMESTER-structured programs (Associate,
  // Bachelor, Higher Degree). CUSTOM programs (Scholarship, Pre-Uni,
  // Foundation, Fullstack, IT Professional, IT Expert) hide those fields and
  // send null. Derive from the SELECTED program's structureType, not a name
  // regex — so all 9 program types behave correctly.
  const selectedProgram = programTypes.find(
    (p) => p.name.toLowerCase() === form.programTypeName.toLowerCase()
  );
  const isScholarship = (selectedProgram?.structureType ?? "").toUpperCase() !== "SEMESTER";
  const noShift = isNoShiftProgram(form.programTypeName);

  function patch<K extends keyof ClassroomFormValue>(k: K, v: ClassroomFormValue[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSave() {
    if (!form.className.trim() || !form.classCode.trim()) {
      toast.error("Class name and code are required.");
      return;
    }

    if (!form.programTypeName) {
      toast.error("Please pick a program.");
      return;
    }
    const telegramChatId = form.telegramChatId?.trim() || null;
    if (form.telegramAlertEnabled && !telegramChatId) {
      toast.error("Telegram group chat ID is required when alerts are enabled.");
      return;
    }
    // Backend `ClassroomRequest` requires a numeric `programTypeId` (not the
    // display name) — look it up from the live /program-types list.
    const programType = programTypes.find(
      (p) => p.name.toLowerCase() === form.programTypeName.toLowerCase()
    );
    if (!programType) {
      toast.error(`Unknown program type "${form.programTypeName}". Reload and try again.`);
      return;
    }

    try {
      const body = {
        className:        form.className.trim(),
        classCode:        form.classCode.trim(),
        programTypeId:    programType.id,
        generation:       Number(form.generation),
        year:             isScholarship ? null : Number(form.year),
        semester:         isScholarship ? null : Number(form.semester),
        shift:            noShift ? null : form.shift,
        academicYear:     Number(form.academicYear),
        startDate:        form.startDate,
        endDate:          form.endDate,
        lab:              form.lab?.trim() || null,
        telegramChatId,
        telegramAlertEnabled: Boolean(form.telegramAlertEnabled),
        status:           form.status,
      };
      if (editing) {
        await updateClassroom({ id: form.id!, body }).unwrap();
        toast.success("Class updated.");
        onSaved?.();
        onOpenChange(false);
        return;
      }

      const created = await createClassroom(body).unwrap();
      toast.success("Class created.");
      onSaved?.();

      if (generateStaticQr && created?.id) {
        setGeneratingQr(true);
        try {
          const qr = await getClassroomStaticQr(created.id).unwrap();
          setCreatedQr({ id: created.id, className: created.className, codeValue: qr.codeValue });
          return; // keep the dialog open to show the static QR
        } catch {
          toast.error("Class created, but the static QR code could not be generated.");
        } finally {
          setGeneratingQr(false);
        }
      }

      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed.");
    }
  }

  async function handleTestTelegram() {
    const telegramChatId = form.telegramChatId?.trim() || null;
    if (!editing || !form.id) {
      toast.error("Save the class first, then test Telegram.");
      return;
    }
    if (!telegramChatId) {
      toast.error("Telegram group chat ID is required.");
      return;
    }
    try {
      const result = await testTelegram({
        id: form.id,
        body: { telegramChatId, telegramAlertEnabled: true },
      }).unwrap();
      if (result.success) {
        toast.success(result.message || "Telegram test message sent.");
      } else {
        toast.error(result.message || "Telegram test failed.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Telegram test failed.");
    }
  }

  const checkInUrl =
    createdQr && typeof window !== "undefined"
      ? `${window.location.origin}/check-in?token=${createdQr.codeValue}&kind=static`
      : "";

  if (createdQr) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md ">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2Icon className="size-5 text-green-600" />
              Class created
            </DialogTitle>
            <DialogDescription>
              Here&apos;s the permanent static QR code for <strong>{createdQr.className}</strong>.
              Print it or display it in the classroom — students scan it to check in.
            </DialogDescription>
          </DialogHeader>

          <div id="static-qr-canvas-wrap" className="flex flex-col items-center gap-3 py-2">
            <div className="rounded-xl border bg-white p-4">
              <QRCodeCanvas value={checkInUrl} size={220} level="H" includeMargin />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <Button variant="outline" asChild className="gap-1.5">
              <Link href={`/dashboard/classrooms/${createdQr.id}/enroll`} onClick={() => handleOpenChange(false)}>
                <UsersIcon className="size-4" />
                Register students
              </Link>
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="gap-1.5"
                onClick={() => {
                  const canvas = document.querySelector<HTMLCanvasElement>("#static-qr-canvas-wrap canvas");
                  if (!canvas) { toast.error("QR not ready."); return; }
                  const a = document.createElement("a");
                  a.href = canvas.toDataURL("image/png");
                  a.download = `${(createdQr.className || "class").trim().replace(/[^\w-]+/g, "_").replace(/_+/g, "_") || "class"}-static-qr.png`;
                  document.body.appendChild(a); a.click(); a.remove();
                }}
              >
                <DownloadIcon className="size-4" /> Download
              </Button>
              <Button onClick={() => handleOpenChange(false)}>Done</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[75vw] sm:max-w-2xl ">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">{editing ? "Edit Class" : "Create Class"}</DialogTitle>
          <DialogDescription>
            {editing ? "Update this classroom's information." : "Add a new classroom to the system."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 text-lg">
          <Field label="Class Name" required>
            <Input
              value={form.className}
              onChange={(e) => patch("className", e.target.value)}
              placeholder="e.g. Web Dev Y2 G6"
            />
          </Field>
          <Field label="Class Code" required>
            <Input
              value={form.classCode}
              onChange={(e) => patch("classCode", e.target.value)}
              placeholder="e.g. WD-Y2-G6"
              className="font-mono"
            />
          </Field>

          <Field label="Program">
            <Select
              value={form.programTypeName}
              onValueChange={(v) => {
                patch("programTypeName", v);
                // ITE has no shift → blank it; switching to a shift program
                // restores a sensible default if it was cleared.
                if (isNoShiftProgram(v)) patch("shift", "");
                else if (!form.shift) patch("shift", "MORNING");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={programTypes.length === 0 ? "Loading…" : "Select program"} />
              </SelectTrigger>
              <SelectContent>
                {/* Live list — all program types from the backend, not a
                    hardcoded subset. */}
                {programTypes.map((p) => (
                  <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Shift">
            <Select
              value={noShift ? "" : form.shift}
              onValueChange={(v) => patch("shift", v)}
              disabled={noShift}
            >
              <SelectTrigger>
                <SelectValue placeholder={noShift ? "No shift (IT Expert)" : "Select shift"} />
              </SelectTrigger>
              <SelectContent>
                {SHIFTS.map((s) => (
                  <SelectItem key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Generation">
            <Input
              type="number"
              value={form.generation}
              onChange={(e) => patch("generation", Number(e.target.value))}
            />
          </Field>
          <Field label="Academic Year">
            <Input
              type="number"
              value={form.academicYear}
              onChange={(e) => patch("academicYear", Number(e.target.value))}
            />
          </Field>

          {!isScholarship && (
            <>
              <Field label="Year">
                <Input
                  type="number"
                  value={form.year ?? ""}
                  onChange={(e) => patch("year", e.target.value ? Number(e.target.value) : null)}
                />
              </Field>
              <Field label="Semester">
                <Input
                  type="number"
                  value={form.semester ?? ""}
                  onChange={(e) => patch("semester", e.target.value ? Number(e.target.value) : null)}
                />
              </Field>
            </>
          )}

          <Field label="Start Date">
            <Input
              type="date"
              value={form.startDate}
              onChange={(e) => patch("startDate", e.target.value)}
            />
          </Field>
          <Field label="End Date">
            <Input
              type="date"
              value={form.endDate}
              onChange={(e) => patch("endDate", e.target.value)}
            />
          </Field>

          <Field label="Lab / Room">
            <Input
              list="lab-options"
              value={form.lab ?? ""}
              onChange={(e) => patch("lab", e.target.value)}
              placeholder="e.g. Lab DevOps"
            />
            <datalist id="lab-options">
              {LABS.map((l) => (
                <option key={l} value={l} />
              ))}
            </datalist>
          </Field>

          <Field label="Status">
            <Select
              value={form.status ? "active" : "inactive"}
              onValueChange={(v) => patch("status", v === "active")}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <div className="col-span-2 grid gap-3 rounded-lg border p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <Label className="flex items-center gap-1.5 text-[12px]">
                  <MessageCircleIcon className="size-4" />
                  Telegram Group
                </Label>
                <p className="text-xs text-muted-foreground/70">
                  Connect this class to a Telegram group for attendance alerts and session reports.
                </p>
              </div>
              <label
                htmlFor="telegram-alert-enabled"
                className="flex cursor-pointer items-center gap-2 text-sm font-medium"
              >
                <Checkbox
                  id="telegram-alert-enabled"
                  checked={Boolean(form.telegramAlertEnabled)}
                  onCheckedChange={(v) => patch("telegramAlertEnabled", v === true)}
                />
                Enable alerts
              </label>
            </div>
            <div className="flex gap-2">
              <Input
                value={form.telegramChatId ?? ""}
                onChange={(e) => patch("telegramChatId", e.target.value)}
                placeholder="e.g. -1001234567890"
                className="font-mono"
              />
              {editing && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTestTelegram}
                  disabled={saving || !(form.telegramChatId ?? "").trim()}
                  className="shrink-0 gap-1.5"
                >
                  {testingTelegram ? (
                    <LoaderCircleIcon className="size-4 animate-spin" />
                  ) : (
                    <SendIcon className="size-4" />
                  )}
                  Test
                </Button>
              )}
            </div>
          </div>
        </div>

        {!editing && (
          <label
            htmlFor="generate-static-qr"
            className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 hover:bg-muted/50"
          >
            <Checkbox
              id="generate-static-qr"
              checked={generateStaticQr}
              onCheckedChange={(v) => setGenerateStaticQr(v === true)}
              className="mt-0.5"
            />
            <span className="space-y-0.5">
              <span className="flex items-center gap-1.5 text-sm font-medium">
                <QrCodeIcon className="size-4" />
                Generate static QR code
              </span>
              <span className="block text-xs text-muted-foreground/70">
                Creates a permanent QR code for this classroom that students can scan to check in.
              </span>
            </span>
          </label>
        )}

        <DialogFooter>
          <Button className="py-2" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button className="py-2" onClick={handleSave} disabled={saving}>
            {saving && <LoaderCircleIcon className="size-4 animate-spin mr-2" />}
            {generatingQr ? "Generating QR…" : editing ? "Save Changes" : "Create"}
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
      <Label className="text-[12px]">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
}
