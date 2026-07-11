"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import { ClassroomFormDialog } from "@/components/classroom-form-dialog";

/** Admin-only "New Class" button — opens the create-class form (matches POST /classrooms). */
export function ClassroomAddButton() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [, startTransition] = useTransition();

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)} className="gap-1.5">
        <PlusIcon className="size-4" /> New Class
      </Button>
        <ClassroomFormDialog
          open={open}
          initial={null}
          onOpenChange={setOpen}
          onSaved={() => startTransition(() => router.refresh())}
          />
    </>
  );
}
