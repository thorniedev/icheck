"use client"; // error boundaries MUST be client components

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/common/logo";
import { AlertTriangleIcon, RotateCcwIcon } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app error]", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-muted/50 flex flex-col items-center justify-center p-6">
      <div className="bg-card rounded-3xl shadow-lg p-10 w-full max-w-md text-center">
        <div className="flex items-center justify-center gap-2 mb-6">
          <Logo size={36} />
          <span className="text-xl font-bold tracking-tight">i-Check</span>
        </div>

        <div className="flex justify-center mb-4">
          <div className="bg-red-50 rounded-full p-4">
            <AlertTriangleIcon className="size-8 text-red-500" />
          </div>
        </div>

        <h1 className="text-xl font-bold text-foreground mb-2">Something went wrong</h1>
        <p className="text-sm text-muted-foreground mb-6">
          We hit an unexpected error rendering this page. You can try again, or
          go back to the dashboard.
        </p>

        {process.env.NODE_ENV !== "production" && (
          <pre className="text-left text-xs bg-muted text-foreground/80 rounded-lg p-3 mb-6 overflow-x-auto whitespace-pre-wrap wrap-break-word">
            {error.message}
            {error.digest && <span className="block mt-1 text-muted-foreground/70">digest: {error.digest}</span>}
          </pre>
        )}

        <div className="flex flex-col gap-2">
          <Button onClick={reset} className="w-full bg-[#273C97] hover:bg-[#1e2e7a] gap-2">
            <RotateCcwIcon className="size-4" />
            Try again
          </Button>
          <Button
            variant="ghost"
            className="w-full text-muted-foreground"
            onClick={() => { window.location.href = "/dashboard"; }}
          >
            Go to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
