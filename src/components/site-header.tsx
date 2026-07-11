"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ChevronRightIcon } from "lucide-react";
import { DarkModeToggle, ThemeSelector } from "@/components/theme-toggle";
import { LogoWordmark } from "@/components/common/logo";
import { NotificationBell } from "@/components/common/notification-bell";

const ROUTE_LABELS: Record<string, string> = {
  "/dashboard":            "Dashboard",
  "/dashboard/classrooms": "Classes",
  "/students":             "Students",
  "/attendance":           "Sessions",
  "/schedule":             "Schedule",
  "/settings":             "Settings",
  "/reports":              "Reports",
  "/sessions":             "Session QR",
  "/student":              "My Information",
};

function getSegments(pathname: string): { label: string; path: string }[] {
  const parts = pathname.split("/").filter(Boolean);
  const segs: { label: string; path: string }[] = [
    { label: "i-Check", path: "/" },
  ];
  let accumulated = "";
  for (const part of parts) {
    accumulated += "/" + part;
    const label =
      ROUTE_LABELS[accumulated] ??
      (part.match(/^\d+$/) ? `#${part}` : capitalize(part));
    segs.push({ label, path: accumulated });
  }
  return segs;
}

function capitalize(s: string) {
  return s
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function SiteHeader() {
  const pathname = usePathname();
  const segments = getSegments(pathname);

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height) bg-background">
      <div className="flex w-full items-center gap-2 px-3 sm:px-4 lg:gap-2 lg:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <SidebarTrigger className="-ml-1 shrink-0" />
          <Link href="/" className="flex shrink-0 items-center md:hidden">
            <LogoWordmark height={30} />
          </Link>
        </div>
        <Separator
          orientation="vertical"
          className="mx-2 hidden data-[orientation=vertical]:h-4 md:block"
        />

        {/* Breadcrumb */}
        <nav className="hidden items-center gap-1 text-base md:flex">
          {segments.map((seg, i) => (
            <span key={seg.path} className="flex items-center gap-1">
              {i > 0 && (
                <ChevronRightIcon className="size-3.5 text-muted-foreground/50" />
              )}
              <span
                className="contents"
              >
                {i === segments.length - 1 ? (
                  <span className="font-semibold text-foreground">
                    {seg.label}
                  </span>
                ) : (
                  <Link
                    href={seg.path}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {seg.label}
                  </Link>
                )}
              </span>
            </span>
          ))}
        </nav>

        {/* ── Right-side controls (Insight-style) ── */}
        <div className="ml-auto flex shrink-0 items-center gap-0.5">

          {/* 1. Dark / Light toggle */}
          <DarkModeToggle />

          {/* 2. Named theme selector */}
          <ThemeSelector />

          {/* 3. Notification bell — real data, unread badge, mark-as-read */}
          <NotificationBell />

        </div>
      </div>
    </header>
  );
}
