"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useUser } from "@/components/user-provider";
import { getErrorMessage } from "@/lib/api/error-utils";
import {
  useGetPendingAmendmentsQuery,
  useReviewAmendmentMutation,
  type AmendmentDto,
  type AmendmentDecision,
} from "@/store/api/amendmentApi";
import {
  CheckIcon,
  XIcon,
  LoaderCircleIcon,
  InboxIcon,
  SearchIcon,
  ClockIcon,
  BellIcon,
} from "lucide-react";
import { NotificationsPanel } from "@/components/common/notifications-panel";

function ago(iso?: string | null): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const min = Math.floor((Date.now() - t) / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

const TYPE_LABEL: Record<string, string> = {
  late_out: "Leaving early",
  leave_early: "Leaving early",
  late: "Late arrival",
  late_arrival: "Late arrival",
  permission: "Permission",
  correction: "Status correction",
  static_qr: "Manual check-in",
  teacher_late: "Teacher late",
};

function typeLabel(name?: string | null, reason?: string | null) {
  const normalizedReason = reason?.trim().toLowerCase() ?? "";
  if (normalizedReason.startsWith("[late_out]") || normalizedReason.startsWith("[early_leave]") || normalizedReason.startsWith("[leave_early]")) {
    return "Leaving early";
  }
  if (normalizedReason.startsWith("[permission]")) {
    return "Permission";
  }
  if (normalizedReason.startsWith("[late]") || normalizedReason.startsWith("[late_arrival]")) {
    return "Late arrival";
  }
  if (!name) return "Amendment";
  return TYPE_LABEL[name.toLowerCase()] ?? name.replace(/_/g, " ");
}

function cleanReason(reason?: string | null) {
  return reason?.replace(/^\[(late|late_arrival|permission|late_out|early_leave|leave_early)\]\s*/i, "").trim() ?? "";
}

export default function AmendmentsPage() {
  const user = useUser();
  const reviewerId = Number(user?.id);

  const { data: pending = [], isLoading, isFetching, refetch } =
    useGetPendingAmendmentsQuery({ size: 100 }, { pollingInterval: 30_000 });
  const [reviewAmendment] = useReviewAmendmentMutation();

  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [remarks, setRemarks] = useState<Record<number, string>>({});
  const [view, setView] = useState<"requests" | "notifications">("requests");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return pending;
    return pending.filter((a) =>
      [a.requestedBy, a.reason, a.requestTypeName].filter(Boolean).join(" ").toLowerCase().includes(q)
    );
  }, [pending, search]);

  async function decide(a: AmendmentDto, decision: AmendmentDecision) {
    if (!reviewerId || Number.isNaN(reviewerId)) {
      toast.error("Could not identify the reviewing admin.");
      return;
    }
    setBusyId(a.id);
    try {
      await reviewAmendment({
        amendmentId: a.id,
        decision,
        reviewerId,
        remark: remarks[a.id]?.trim() || undefined,
      }).unwrap();
      toast.success(
        decision === "APPROVED"
          ? `Approved — ${a.requestedBy ?? "student"} has been notified.`
          : `Rejected — ${a.requestedBy ?? "student"} has been notified.`
      );
    } catch (e) {
      toast.error(getErrorMessage(e, "Could not submit the review."));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 pt-10 pb-8 max-w-275 mx-auto w-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Amendment Requests</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review student late, permission, and early-leave requests. Approving updates the student&apos;s
            attendance status and notifies them.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 dark:bg-orange-950/40 dark:text-orange-300 gap-1.5">
            <ClockIcon className="size-3.5" />
            {pending.length} pending
          </Badge>
        </div>
      </div>

      {/* Tabs: pending requests vs all notifications */}
      <div className="mb-6 flex gap-1 border-b border-border">
        <button
          onClick={() => setView("requests")}
          className={`-mb-px flex items-center gap-1.5 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            view === "requests" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground/80"
          }`}
        >
          <InboxIcon className="size-4" /> Requests ({pending.length})
        </button>
        <button
          onClick={() => setView("notifications")}
          className={`-mb-px flex items-center gap-1.5 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            view === "notifications" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground/80"
          }`}
        >
          <BellIcon className="size-4" /> Notifications
        </button>
      </div>

      {view === "notifications" ? (
        <NotificationsPanel />
      ) : (
      <>
      {/* Search */}
      <div className="relative max-w-md mb-6">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/60" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by student, reason, type…"
          className="pl-9 pr-9"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-muted-foreground/70 hover:text-foreground hover:bg-muted"
            aria-label="Clear search"
          >
            <XIcon className="size-4" />
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <LoaderCircleIcon className="size-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground/70 bg-card rounded-2xl border border-border">
          <InboxIcon className="size-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">
            {search ? "No requests match your search." : "No pending requests."}
          </p>
          <p className="mt-1 text-sm">You&apos;re all caught up.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((a) => {
            const busy = busyId === a.id;
            return (
              <div
                key={a.id}
                className="rounded-xl border border-border bg-card p-4 sm:p-5"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground">
                        {a.requestedBy ?? "Unknown student"}
                      </span>
                      <Badge variant="secondary" className="text-xs font-medium">
                        {typeLabel(a.requestTypeName, a.reason)}
                      </Badge>
                      {a.sessionId != null && (
                        <span className="text-xs text-muted-foreground/70">
                          Session #{a.sessionId}
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 text-sm text-foreground/90">
                      {cleanReason(a.reason) || <span className="text-muted-foreground/60">No reason provided.</span>}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground/60">
                      Submitted {ago(a.createdAt)}
                      {a.leaveTime ? ` · leave at ${new Date(a.leaveTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <Input
                    value={remarks[a.id] ?? ""}
                    onChange={(e) => setRemarks((r) => ({ ...r, [a.id]: e.target.value }))}
                    placeholder="Optional note to the student…"
                    className="h-9 flex-1 min-w-50"
                    disabled={busy}
                  />
                  <Button
                    size="sm"
                    className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => decide(a, "APPROVED")}
                    disabled={busy}
                  >
                    {busy ? <LoaderCircleIcon className="size-4 animate-spin" /> : <CheckIcon className="size-4" />}
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900/50 dark:hover:bg-red-950/30"
                    onClick={() => decide(a, "REJECTED")}
                    disabled={busy}
                  >
                    <XIcon className="size-4" />
                    Reject
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!isLoading && (
        <div className="mt-6 flex justify-center">
          <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-1.5 text-muted-foreground">
            {isFetching ? <LoaderCircleIcon className="size-4 animate-spin" /> : null}
            Refresh
          </Button>
        </div>
      )}
      </>
      )}
    </div>
  );
}
