"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PencilIcon } from "lucide-react";
import { ClassroomFormDialog, type ClassroomFormValue } from "@/components/classroom-form-dialog";

/**
 * Admin-only "Edit Class" button — opens the classroom form pre-filled with the
 * current class, so admins can change name / program / shift / dates / lab /
 * status without leaving the class detail page.
 */
export function ClassroomEditButton({ classroom }: { classroom: ClassroomFormValue }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [, startTransition] = useTransition();

  return (
    <>
      <Button variant="outline" className="p-5 gap-1.5" onClick={() => setOpen(true)}>
        <PencilIcon className="size-4" /> Edit Class
      </Button>
      <ClassroomFormDialog
        open={open}
        initial={classroom}
        onOpenChange={setOpen}
        onSaved={() => startTransition(() => router.refresh())}
      />
    </>
  );
}
