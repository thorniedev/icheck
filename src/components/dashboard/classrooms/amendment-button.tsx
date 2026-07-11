"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AmendmentDialog, type AmendmentDialogStudent } from "@/components/amendment-dialog";

interface Props {
  students: AmendmentDialogStudent[];
  sessionId: number | null;
  mode?: "teacher" | "admin";
}

/**
 * Tiny client wrapper so the server-rendered checked-attendance page can drop
 * an "Amendment" button without itself becoming a client component. Opens the
 * AmendmentDialog and refreshes the route after a save so the table picks up
 * the new status (the realtime stream also patches it in place — this is the
 * fallback for the rare browser that can't open a WebSocket).
 */
export function AmendmentButton({ students, sessionId, mode = "teacher" }: Props) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  return (
    <>
      <Button
        className="bg-primary p-5"
        type="button"
        disabled={!sessionId}
        onClick={() => setOpen(true)}
      >
        {mode === "admin" ? "Edit Attendance" : "Amendment"}
      </Button>
      <AmendmentDialog
        mode={mode}
        open={open}
        onOpenChange={setOpen}
        students={students}
        sessionId={sessionId}
        onSaved={() => router.refresh()}
      />
    </>
  );
}
