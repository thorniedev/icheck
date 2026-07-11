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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoaderCircleIcon, PlusIcon } from "lucide-react";
import { useCreateTeacherMutation, useUpdateTeacherMutation } from "@/store/api/userApi";
import { getErrorMessage } from "@/lib/api/error-utils";

export interface TeacherFormValue {
  id?: number;
  name: string;
  email: string;
  phone: string;
  specialization: string;
  /** Only used when creating — ignored on edit. */
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

const empty: TeacherFormValue = {
  name: "",
  email: "",
  phone: "",
  specialization: "",
  password: "",
  temporaryPassword: true,
};

interface Props {
  open: boolean;
  initial?: TeacherFormValue | null;
  onOpenChange: (o: boolean) => void;
}

export function TeacherFormDialog({ open, initial, onOpenChange }: Props) {
  const editing = !!initial?.id;
  const [createTeacher, { isLoading: creating }] = useCreateTeacherMutation();
  const [updateTeacher, { isLoading: updating }] = useUpdateTeacherMutation();
  const [form, setForm] = useState<TeacherFormValue>(empty);

  // Reset the form whenever the dialog transitions to open (adjusting state
  // during render avoids the cascading-render set-state-in-effect pitfall).
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setForm(initial ? { ...empty, ...initial } : { ...empty, password: generateTempPassword() });
    }
  }

  function patch<K extends keyof TeacherFormValue>(k: K, v: TeacherFormValue[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSave() {
    if (!form.name.trim() || !form.email.trim()) {
      toast.error("Name and email are required.");
      return;
    }
    if (!editing && (form.password ?? "").length < 6) {
      toast.error("Initial password must be at least 6 characters so the teacher can log in.");
      return;
    }
    try {
      if (editing && form.id) {
        await updateTeacher({
          id: form.id,
          body: {
            name: form.name.trim(),
            email: form.email.trim(),
            phone: form.phone.trim() || null,
            specialization: form.specialization.trim() || null,
          },
        }).unwrap();
        toast.success("Teacher updated.");
      } else {
        await createTeacher({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || null,
          specialization: form.specialization.trim() || null,
          username: form.email.trim(),
          password: (form.password ?? ""),
          temporaryPassword: (form.temporaryPassword ?? true),
        }).unwrap();
        const credentials = `Email: ${form.email.trim()}\nPassword: ${(form.password ?? "")}`;
        toast.success("Teacher registered. Share these credentials:", {
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
      toast.error(getErrorMessage(e, editing ? "Could not update teacher." : "Could not register teacher."));
    }
  }

  const saving = creating || updating;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Teacher" : "Register Teacher"}</DialogTitle>
          <DialogDescription>
            {editing ? "Update this teacher's details." : "Create a teacher account from live API data."}
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
          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone">
              <Input
                value={form.phone}
                onChange={(e) => patch("phone", e.target.value)}
                placeholder="Phone"
              />
            </Field>
            <Field label="Specialization">
              <Input
                value={form.specialization}
                onChange={(e) => patch("specialization", e.target.value)}
                placeholder="e.g. Frontend"
              />
            </Field>
          </div>

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
                  Share with the teacher — they log in at <span className="font-mono">/login</span> using their email + this password.
                </p>
              </Field>
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                <Checkbox
                  checked={(form.temporaryPassword ?? true)}
                  onCheckedChange={(v) => patch("temporaryPassword", v === true)}
                />
                <span>Force teacher to change this password on first login</span>
              </label>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gap-1.5">
            {saving ? <LoaderCircleIcon className="size-4 animate-spin" /> : <PlusIcon className="size-4" />}
            {editing ? "Save Changes" : "Register"}
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
