"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BellIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useUser } from "@/components/user-provider";
import {
  useGetNotificationsQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
} from "@/store/api/notificationApi";

function isUnread(status?: string) {
  if (!status) return true; // default to unread when backend doesn't set it
  return status.toUpperCase() !== "READ";
}

/** Relative-time renderer that gracefully degrades to the raw value. */
function ago(iso?: string): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return iso;
  const diff = Date.now() - t;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  return `${days}d ago`;
}

/**
 * Bell + dropdown for the signed-in user's notifications. Skips entirely
 * when no userId is available (e.g. logged-out routes that still mount the
 * layout).
 */
export function NotificationBell() {
  const user = useUser();
  const router = useRouter();
  const userId = user?.id ?? "";
  const isAdmin = user?.role === "ADMIN";
  const [open, setOpen] = useState(false);

  const { data: notifications = [], refetch } = useGetNotificationsQuery(userId, {
    skip: !userId,
    pollingInterval: 15_000, // near-real-time poll for new requests/decisions
  });
  const [markRead] = useMarkNotificationReadMutation();
  const [markAllRead] = useMarkAllNotificationsReadMutation();

  const unread = notifications.filter((n) => isUnread(n.status));
  const unreadCount = unread.length;

  async function handleClick(n: { id: number; type?: string }, alreadyRead: boolean) {
    if (!alreadyRead) {
      try { await markRead(n.id).unwrap(); } catch { /* swallow — UI still updates via cache */ }
    }
    // An admin clicking an amendment notification jumps straight to the review
    // inbox so they can approve/reject it.
    if (isAdmin && n.type?.toUpperCase() === "AMENDMENT") {
      setOpen(false);
      router.push("/amendments");
    }
  }

  async function handleMarkAll() {
    if (!userId) return;
    try { await markAllRead(userId).unwrap(); refetch(); } catch { /* same */ }
  }

  if (!userId) return null;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-muted"
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        >
          <BellIcon className="size-4 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-1.5">
          <DropdownMenuLabel className="px-0 py-0">Notifications</DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleMarkAll}>
              Mark all read
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              No notifications yet.
            </p>
          ) : (
            notifications.slice(0, 20).map((n) => {
              const unreadRow = isUnread(n.status);
              return (
                <DropdownMenuItem
                  key={n.id}
                  className={`flex flex-col items-start gap-0.5 ${unreadRow ? "bg-primary/5" : ""} ${
                    isAdmin && n.type?.toUpperCase() === "AMENDMENT" ? "cursor-pointer" : ""
                  }`}
                  onClick={() => handleClick(n, !unreadRow)}
                >
                  <div className="flex w-full items-start gap-2">
                    {unreadRow && (
                      <span className="mt-1.5 inline-block size-2 shrink-0 rounded-full bg-primary" />
                    )}
                    <p className="flex-1 text-sm leading-tight">{n.message}</p>
                  </div>
                  <p className="pl-4 text-[11px] text-muted-foreground/70">
                    {n.type ? n.type.replace(/_/g, " ").toLowerCase() : ""}
                    {n.createdAt ? ` · ${ago(n.createdAt)}` : ""}
                  </p>
                </DropdownMenuItem>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
