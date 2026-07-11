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
import { Checkbox } from "@/components/ui/checkbox";
import { MultiCombobox } from "@/components/ui/multi-combobox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoaderCircleIcon, PlusIcon } from "lucide-react";
import {
  useCreateStudentMutation,
  useUpdateStudentMutation,
} from "@/store/api/userApi";
import { useEnrollStudentMutation } from "@/store/api/enrollmentApi";
import { getErrorMessage } from "@/lib/api/error-utils";
import type { ClassroomDto } from "@/store/api/attendanceApi";

export interface StudentFormValue {
  id?: number;
  name: string;
  email: string;
  studentNo: string;
  gender: string;
  phone: string;
  classId?: number | null;
  status?: string;
  /** Only used when creating — ignored on edit. Filled from `empty` if omitted. */
  password?: string;
  /** Only used when creating — ignored on edit. */
  temporaryPassword?: boolean;
}

/** Generates a short, easy-to-share temporary password
 *  (8 chars, mix of letters + digits). */
function generateTempPassword(): string {
  const alphabet = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const buf = new Uint32Array(8);
  crypto.getRandomValues(buf);
  return Array.from(buf, (n) => alphabet[n % alphabet.length]).join("");
}

const empty: StudentFormValue = {
  name: "",
  email: "",
  studentNo: "",
  gender: "",
  phone: "",
  classId: null,
  status: "ACTIVE",
  password: "",
  temporaryPassword: true,
};

interface Props {
  open: boolean;
  initial?: StudentFormValue | null;
  classrooms: ClassroomDto[];
  onOpenChange: (o: boolean) => void;
}

export function StudentFormDialog({ open, initial, classrooms, onOpenChange }: Props) {
  const editing = !!initial?.id;
  const [createStudent, { isLoading: creating }] = useCreateStudentMutation();
  const [updateStudent, { isLoading: updating }] = useUpdateStudentMutation();
  const [enrollStudent] = useEnrollStudentMutation();
  const [form, setForm] = useState<StudentFormValue>(empty);
  const [selectedClassIds, setSelectedClassIds] = useState<number[]>([]);
  const [enrolling, setEnrolling] = useState(false);

  // Reset the form whenever the dialog transitions to open (adjusting state
  // during render avoids the cascading-render set-state-in-effect pitfall).
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      // For brand-new students auto-suggest a temporary password so admin can
      // share it with the student — admin can edit it before saving.
      const seed = initial ? { ...empty, ...initial } : { ...empty, password: generateTempPassword() };
      setForm(seed);
      setSelectedClassIds(initial?.classId ? [initial.classId] : []);
    }
  }

  function patch<K extends keyof StudentFormValue>(k: K, v: StudentFormValue[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSave() {
    if (!form.name.trim() || !form.email.trim() || !form.studentNo.trim()) {
      toast.error("Name, email and student number are required.");
      return;
    }

    if (!editing && (form.password ?? "").length < 6) {
      toast.error("Initial password must be at least 6 characters so the student can log in.");
      return;
    }

    try {
      if (editing && form.id) {
        await updateStudent({
          id: form.id,
          body: {
            name: form.name.trim(),
            email: form.email.trim(),
            studentNo: form.studentNo.trim(),
            gender: form.gender || undefined,
            phone: form.phone.trim() || null,
            classId: selectedClassIds[0] ?? null,
            status: form.status,
          },
        }).unwrap();
        toast.success("Student updated.");
      } else {
        const created = await createStudent({
          name: form.name.trim(),
          email: form.email.trim(),
          studentNo: form.studentNo.trim(),
          gender: form.gender || undefined,
          phone: form.phone.trim() || null,
          status: "ACTIVE",
          classId: selectedClassIds[0] ?? null,
          // Login credentials — backend forwards these to Keycloak so the
          // student can sign in with email + this password.
          username: form.email.trim(),
          password: (form.password ?? ""),
          temporaryPassword: (form.temporaryPassword ?? true),
        }).unwrap();

        // A student can be registered into more than one class — enroll into
        // every additionally selected classroom (Enrollment table, many-to-many).
        if (created?.id && selectedClassIds.length > 1) {
          setEnrolling(true);
          const rest = selectedClassIds.slice(1);
          const results = await Promise.allSettled(
            rest.map((classroomId) => enrollStudent({ classroomId, userId: created.id }).unwrap())
          );
          setEnrolling(false);
          const failed = results.filter((r) => r.status === "rejected").length;
          if (failed > 0) {
            toast.error(`Student created, but failed to register ${failed} class${failed === 1 ? "" : "es"}.`);
          }
        }
        // Show the admin the credentials they need to share with the student
        // — clicking copies them to the clipboard so it's hard to lose them.
        const credentials = `Email: ${form.email.trim()}\nPassword: ${(form.password ?? "")}`;
        toast.success("Student registered. Share these credentials:", {
          description: credentials,
          duration: 15000,
          action: {
            label: "Copy",
            onClick: () => {
              void navigator.clipboard?.writeText(credentials);
            },
          },
        });
      }
      onOpenChange(false);
    } catch (e) {
      setEnrolling(false);
      toast.error(getErrorMessage(e, editing ? "Could not update student." : "Could not register student."));
    }
  }

  const saving = creating || updating || enrolling;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[75vw] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Student" : "Register Student"}</DialogTitle>
          <DialogDescription>
            {editing ? "Update this student's details." : "Create a student account."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <Field label="Full name" required>
            <Input
              value={form.name}
              onChange={(e) => patch("name", e.target.value)}
              placeholder="Full name"
            />
          </Field>
          <Field label="Email" required>
            <Input
              value={form.email}
              onChange={(e) => patch("email", e.target.value)}
              placeholder="Email"
              type="email"
            />
          </Field>
          <Field label="Student number" required>
            <Input
              value={form.studentNo}
              onChange={(e) => patch("studentNo", e.target.value)}
              placeholder="e.g. ITE-2024-001"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Gender">
              <Select value={form.gender || undefined} onValueChange={(v) => patch("gender", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Phone">
              <Input
                value={form.phone}
                onChange={(e) => patch("phone", e.target.value)}
                placeholder="Phone"
              />
            </Field>
          </div>

          {editing && (
            <Field label="Status">
              <Select value={form.status ?? "ACTIVE"} onValueChange={(v) => patch("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          )}

          {/* Login credentials — only shown when creating, since Keycloak password
              changes for existing accounts should go through "Reset password" instead. */}
          {!editing && (
            <>
              <Field label="Initial password" required>
                <div className="flex gap-2">
                  <Input
                    value={(form.password ?? "")}
                    onChange={(e) => patch("password", e.target.value)}
                    placeholder="At least 6 characters"
                    type="text"
                    autoComplete="new-password"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => patch("password", generateTempPassword())}
                  >
                    Generate
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground/70">
                  Share this with the student so they can sign in. They&apos;ll log in
                  at <span className="font-mono">/login</span> with their email + this password.
                </p>
              </Field>
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                <Checkbox
                  checked={(form.temporaryPassword ?? true)}
                  onCheckedChange={(v) => patch("temporaryPassword", v === true)}
                />
                <span>Force student to change this password on first login</span>
              </label>
            </>
          )}

          {/* A student can be registered into more than one class. */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">
              Classes ({selectedClassIds.length} selected)
            </p>
            <MultiCombobox
              options={classrooms.map((c) => ({
                value: String(c.id),
                label: c.className,
                hint: c.classCode,
              }))}
              selected={selectedClassIds.map(String)}
              onChange={(next) => setSelectedClassIds(next.map(Number))}
              placeholder="Search & select classes…"
              searchPlaceholder="Search by class name or code…"
              emptyText="No classes found."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gap-1.5">
            {saving ? <LoaderCircleIcon className="size-4 animate-spin" /> : <PlusIcon className="size-4" />}
            {editing ? "Save Changes" : enrolling ? "Enrolling…" : "Register"}
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
