"use client";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { cn } from "@/lib/utils";

export function Modal({
  children,
  className,
  closeButtonClassName,
}: {
  children: React.ReactNode;
  className?: string;
  closeButtonClassName?: string;
}) {
  const router = useRouter();

  return (
    <Dialog
      defaultOpen
      open
      onOpenChange={() => router.back()}
    >
      <DialogContent
        className={cn("sm:max-w-4xl px-10 py-8", className)}
        closeButtonClassName={closeButtonClassName}
      >
        <DialogHeader>
          <VisuallyHidden>
            <DialogTitle>Create Class Modal</DialogTitle>
          </VisuallyHidden>

          <VisuallyHidden>
            <DialogDescription>
              Modal for creating a class.
            </DialogDescription>
          </VisuallyHidden>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
