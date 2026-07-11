"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LoaderCircleIcon, UserCogIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGetTeachersQuery } from "@/store/api/userApi";
import { useAssignSubstituteMutation } from "@/store/api/qrApi";

interface Props {
  /** Today's session id for this classroom — null if no session is scheduled today. */
  sessionId: number | null;
  /** Teacher currently assigned as substitute for today's session, if any. */
  currentSubstituteName?: string | null;
}

export function AssignSubstituteDialog({ sessionId, currentSubstituteName }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [teacherId, setTeacherId] = useState<string>("");
  const [reason, setReason] = useState("");
  const { data: teachers = [] } = useGetTeachersQuery();
  const [assignSubstitute, { isLoading }] = useAssignSubstituteMutation();

  function handleOpenChange(o: boolean) {
    if (o) {
      setTeacherId("");
      setReason("");
    }
    setOpen(o);
  }

  async function handleAssign() {
    if (!sessionId) {
      toast.error("No session is scheduled today for this class.");
      return;
    }
    if (!teacherId) {
      toast.error("Pick a teacher to assign as substitute.");
      return;
    }
    try {
      await assignSubstitute({
        sessionId,
        substituteTeacherId: Number(teacherId),
        reason: reason.trim() || undefined,
      }).unwrap();
      toast.success("Substitute teacher assigned. They'll see this class in My Classes.");
      setOpen(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not assign substitute.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-1.5" disabled={!sessionId} title={!sessionId ? "No session scheduled today" : undefined}>
          <UserCogIcon className="size-4" />
          {currentSubstituteName ? `Substitute: ${currentSubstituteName}` : "Assign Substitute"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Substitute Teacher</DialogTitle>
          <DialogDescription>
            For today&apos;s session only. The substitute teacher will also see this class
            under &quot;My Classes&quot;.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Substitute Teacher</Label>
            <Select value={teacherId} onValueChange={setTeacherId}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select a teacher" /></SelectTrigger>
              <SelectContent>
                {teachers.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Reason (optional)</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Regular teacher is on leave"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleAssign} disabled={isLoading}>
            {isLoading && <LoaderCircleIcon className="size-4 animate-spin mr-2" />}
            Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
