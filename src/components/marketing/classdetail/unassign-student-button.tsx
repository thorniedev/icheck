"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserMinusIcon, LoaderCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUnenrollStudentMutation } from "@/store/api/enrollmentApi";
import { getErrorMessage } from "@/lib/api/error-utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/**
 * Admin-only "Unassign" action shown per student row on the class roster.
 * Calls DELETE /classrooms/{classroomId}/enrollments/{userId} and refreshes the
 * server-rendered list. The student account + attendance history are kept; only
 * the enrollment in THIS class is removed.
 */
export function UnassignStudentButton({
  classroomId,
  userId,
  studentName,
}: {
  classroomId: number;
  userId: number;
  studentName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unenroll, { isLoading }] = useUnenrollStudentMutation();

  async function confirm() {
    try {
      await unenroll({ classroomId, userId }).unwrap();
      toast.success(`${studentName} unassigned from this class.`);
      setOpen(false);
      router.refresh(); // re-fetch the server-rendered roster
    } catch (e) {
      toast.error(getErrorMessage(e, "Could not unassign the student."));
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 gap-1.5 text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/30"
        onClick={() => setOpen(true)}
      >
        <UserMinusIcon className="size-4" />
        Unassign
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unassign {studentName}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the student from this class. Their account and past
              attendance are kept, but they&apos;ll no longer appear on the roster
              or be able to check in for it. You can re-enroll them later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault(); // keep dialog open until the request resolves
                confirm();
              }}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isLoading && <LoaderCircleIcon className="size-4 animate-spin mr-1.5" />}
              Unassign
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
