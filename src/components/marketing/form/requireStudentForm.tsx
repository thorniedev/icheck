"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoaderCircleIcon, SendIcon } from "lucide-react";
import { api } from "@/lib/api/api-client";
import { getErrorMessage } from "@/lib/api/error-utils";
import { useUser } from "@/components/user-provider";
import { useGetUserEnrollmentsQuery } from "@/store/api/userApi";

type StudentRequestType = "permission" | "late_arrival" | "leave_early";

type AmendmentTypeOption = {
  id: number;
  name: string;
  description?: string | null;
};

const REQUEST_COPY: Record<StudentRequestType, { label: string; pending: string }> = {
  late_arrival: {
    label: "Late arrival",
    pending: "late-arrival request",
  },
  permission: {
    label: "Permission",
    pending: "permission request",
  },
  leave_early: {
    label: "Leaving early",
    pending: "early-leave request",
  },
};

/**
 * Student attendance request form.
 *
 * For when a student missed the QR, needs official permission, or leaves early:
 * they pick the class, a type, a time and a reason, and submit.
 * Posts to `POST /api/v1/amendments/late-out`, which creates a PENDING
 * amendment — the admin gets a notification, reviews it, and the student sees
 * the decision back in their notification bell.
 */
export default function RequirePermissionForm() {
  const router = useRouter();
  const user = useUser();
  const userId = user?.id ?? "";

  const { data: enrollments = [] } = useGetUserEnrollmentsQuery(userId, { skip: !userId });
  const [amendmentTypes, setAmendmentTypes] = useState<AmendmentTypeOption[]>([]);

  const defaultTime = useMemo(() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }, []);

  const [classroomId, setClassroomId] = useState("");
  const [type, setType] = useState<StudentRequestType>("late_arrival");
  const [when, setWhen] = useState(defaultTime);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.get("/amendment-types")
      .then((raw) => {
        if (cancelled) return;
        const list = Array.isArray(raw)
          ? raw as AmendmentTypeOption[]
          : Array.isArray((raw as { payload?: AmendmentTypeOption[] } | null)?.payload)
            ? (raw as { payload: AmendmentTypeOption[] }).payload
            : [];
        setAmendmentTypes(list);
      })
      .catch(() => {
        if (!cancelled) setAmendmentTypes([]);
      });
    return () => { cancelled = true; };
  }, []);

  const requestTypes = useMemo(() => {
    const allowed = new Set<StudentRequestType>(["late_arrival", "permission", "leave_early"]);
    const fromApi = amendmentTypes
      .filter((item): item is AmendmentTypeOption & { name: StudentRequestType } =>
        allowed.has(item.name as StudentRequestType)
      )
      .sort((a, b) => {
        const order: Record<StudentRequestType, number> = { late_arrival: 0, permission: 1, leave_early: 2 };
        return order[a.name] - order[b.name];
      });
    return fromApi.length > 0
      ? fromApi
      : [
          { id: 1, name: "late_arrival", description: "Student arrived late or missed the QR window" },
          { id: 2, name: "permission", description: "Approved excused permission request" },
          { id: 3, name: "leave_early", description: "Student leaves before the session ends" },
        ];
  }, [amendmentTypes]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!userId) { toast.error("Please log in again."); return; }
    if (!classroomId) { toast.error("Pick the class this is for."); return; }
    if (reason.trim().length < 10) {
      toast.error("Reason must be at least 10 characters.");
      return;
    }

    setSaving(true);
    try {
      // Make sure today's session exists, then find it for the chosen class.
      const today = new Date().toISOString().slice(0, 10);
      await api.post(`/sessions/classrooms/${classroomId}/ensure-today`, {}).catch(() => {});
      const raw = await api.get(`/sessions/classrooms/${classroomId}?from=${today}&to=${today}&size=1`);
      const payload = (raw as { payload?: { content?: Array<{ id: number }> } | Array<{ id: number }> } | null)?.payload;
      const list: Array<{ id: number }> =
        payload && typeof payload === "object" && "content" in payload && Array.isArray(payload.content)
          ? payload.content
          : Array.isArray(payload) ? (payload as Array<{ id: number }>) : [];
      const sessionId = list[0]?.id;
      if (!sessionId) {
        toast.error("No session is scheduled for that class today.");
        return;
      }

      await api.post(`/amendments/late-out`, {
        studentId: Number(userId),
        sessionId,
        leaveTime: when.length === 16 ? `${when}:00` : when,
        requestTypeName: type,
        reason: `[${type}] ${reason.trim()}`,
      });

      toast.success(`${REQUEST_COPY[type].label} submitted. You'll get a notification once an admin reviews it.`);
      setReason("");
      router.refresh();
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not submit your request."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="grid gap-5">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Request Attendance Amendment</h1>
          <p className="text-sm text-muted-foreground">
            Missed the QR, need official permission, or need to leave early?
            Submit a request — an admin reviews it and you&apos;ll see the
            decision in your notifications.
          </p>
        </div>

        <Field label="Class" required>
          <Select value={classroomId} onValueChange={setClassroomId}>
            <SelectTrigger>
              <SelectValue placeholder={enrollments.length === 0 ? "No classes enrolled" : "Pick a class"} />
            </SelectTrigger>
            <SelectContent>
              {enrollments.map((e) => {
                const id = String(e.classroomId ?? e.id ?? "");
                const label = e.className ?? e.classroomName ?? e.classCode ?? `Class ${id}`;
                return id ? <SelectItem key={id} value={id}>{label}</SelectItem> : null;
              })}
            </SelectContent>
          </Select>
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Type" required>
            <Select value={type} onValueChange={(v) => setType(v as StudentRequestType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {requestTypes.map((item) => (
                  <SelectItem key={item.name} value={item.name}>
                    {REQUEST_COPY[item.name as StudentRequestType]?.label ?? item.name.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Time" required>
            <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
            <p className="text-[11px] text-muted-foreground/70">Defaults to now — adjust if needed.</p>
          </Field>
        </div>

        <Field label="Reason" required>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain why — e.g. doctor's appointment, traffic, QR expired before I could scan..."
            className="min-h-28"
          />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => { setReason(""); setClassroomId(""); }}
            disabled={saving}
          >
            Reset
          </Button>
          <Button type="submit" className="w-full gap-1.5" disabled={saving}>
            {saving ? <LoaderCircleIcon className="size-4 animate-spin" /> : <SendIcon className="size-4" />}
            Submit Request
          </Button>
        </div>
      </div>
    </form>
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
      <Label className="text-sm">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
}
