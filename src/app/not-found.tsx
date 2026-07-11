import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/common/logo";
import { CompassIcon } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-muted/50 flex flex-col items-center justify-center p-6">
      <div className="bg-card rounded-3xl shadow-lg p-10 w-full max-w-md text-center">
        {/* Brand */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <Logo size={36} />
          <span className="text-xl font-bold tracking-tight">i-Check</span>
        </div>

        {/* Big 404 */}
        <div className="relative inline-flex items-center justify-center mb-3">
          <span className="text-7xl font-black text-primary/10 select-none">404</span>
          <CompassIcon className="absolute size-10 text-primary" />
        </div>

        <h1 className="text-xl font-bold text-foreground mb-2">Page not found</h1>
        <p className="text-sm text-muted-foreground mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        <div className="flex flex-col gap-2">
          <Link href="/dashboard">
            <Button className="w-full bg-primary hover:bg-primary/90">
              Go to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
