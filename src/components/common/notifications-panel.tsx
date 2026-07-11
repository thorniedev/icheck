"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  SearchIcon,
  XIcon,
  LoaderCircleIcon,
  InboxIcon,
  ChevronDownIcon,
} from "lucide-react";
import {
  useGetAllNotificationsQuery,
  type NotificationAdminDto,
} from "@/store/api/notificationApi";

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

function typeBadgeClass(type?: string | null) {
  switch ((type ?? "").toUpperCase()) {
    case "AMENDMENT": return "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300";
    case "WARNING":   return "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300";
    case "ALERT":     return "bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400";
    default:          return "bg-muted text-muted-foreground";
  }
}

function isUnread(status?: string | null) {
  return (status ?? "").toUpperCase() !== "READ";
}

/** Admin — all notifications with filters (student/class/generation/program-type/status). */
export function NotificationsPanel() {
  const { data: rows = [], isLoading, isFetching } = useGetAllNotificationsQuery(
    { size: 300 },
    { pollingInterval: 30_000 },
  );

  const [search, setSearch] = useState("");
  const [programType, setProgramType] = useState("");
  const [generation, setGeneration] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState<"ALL" | "UNREAD" | "READ">("ALL");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Distinct filter options derived from the data.
  const programTypes = useMemo(
    () => [...new Set(rows.map((r) => r.programType).filter(Boolean))].sort() as string[],
    [rows],
  );
  const generations = useMemo(
    () => [...new Set(rows.map((r) => r.generation).filter((g) => g != null))].sort((a, b) => (a as number) - (b as number)) as number[],
    [rows],
  );
  const types = useMemo(
    () => [...new Set(rows.map((r) => r.type).filter(Boolean))].sort() as string[],
    [rows],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (programType && r.programType !== programType) return false;
      if (generation && String(r.generation) !== generation) return false;
      if (type && (r.type ?? "") !== type) return false;
      if (status === "UNREAD" && !isUnread(r.status)) return false;
      if (status === "READ" && isUnread(r.status)) return false;
      if (q) {
        const hay = [r.userName, r.className, r.classCode, r.message, r.programType]
          .filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, search, programType, generation, type, status]);

  const unreadTotal = rows.filter((r) => isUnread(r.status)).length;

  function clearFilters() {
    setSearch(""); setProgramType(""); setGeneration(""); setType(""); setStatus("ALL");
  }
  const anyFilter = search || programType || generation || type || status !== "ALL";

  return (
    <div className="flex flex-col gap-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/60" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search student, class, message…"
            className="pl-9 pr-9"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-muted-foreground/70 hover:text-foreground hover:bg-muted" aria-label="Clear">
              <XIcon className="size-4" />
            </button>
          )}
        </div>

        <FilterSelect label="Program" value={programType} onChange={setProgramType}
          options={programTypes.map((p) => ({ label: p, value: p }))} />
        <FilterSelect label="Generation" value={generation} onChange={setGeneration}
          options={generations.map((g) => ({ label: `Gen ${g}`, value: String(g) }))} />
        <FilterSelect label="Type" value={type} onChange={setType}
          options={types.map((t) => ({ label: t.toLowerCase(), value: t }))} />

        <div className="flex gap-1">
          {(["ALL", "UNREAD", "READ"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                status === s
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:border-primary/40"
              }`}
            >
              {s === "ALL" ? "All" : s === "UNREAD" ? `Unread (${unreadTotal})` : "Read"}
            </button>
          ))}
        </div>

        {anyFilter && (
          <button onClick={clearFilters} className="text-xs text-muted-foreground/70 hover:text-foreground underline">
            Clear
          </button>
        )}
        <span className="ml-auto text-xs text-muted-foreground/70">
          {filtered.length} of {rows.length}
        </span>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-16"><LoaderCircleIcon className="size-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground/70 bg-card rounded-2xl border border-border">
          <InboxIcon className="size-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No notifications match these filters.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card divide-y divide-border/50">
          {filtered.map((n) => (
            <NotificationRow key={n.id} n={n} expanded={expandedId === n.id}
              onToggle={() => setExpandedId((id) => (id === n.id ? null : n.id))} />
          ))}
        </div>
      )}

      {!isLoading && isFetching && (
        <p className="text-center text-xs text-muted-foreground/60">Refreshing…</p>
      )}
    </div>
  );
}

function NotificationRow({ n, expanded, onToggle }: { n: NotificationAdminDto; expanded: boolean; onToggle: () => void }) {
  const unread = isUnread(n.status);
  return (
    <div className={unread ? "bg-primary/5" : ""}>
      <button onClick={onToggle} className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors">
        {unread ? <span className="mt-1.5 inline-block size-2 shrink-0 rounded-full bg-primary" /> : <span className="mt-1.5 size-2 shrink-0" />}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-foreground">{n.userName ?? "—"}</span>
            <Badge className={`text-[10px] ${typeBadgeClass(n.type)}`}>{(n.type ?? "").toLowerCase() || "—"}</Badge>
            {n.className && (
              <span className="text-xs text-muted-foreground/80">
                {n.className}{n.generation != null ? ` · Gen ${n.generation}` : ""}
              </span>
            )}
          </div>
          <p className="mt-0.5 line-clamp-1 text-sm text-foreground/90">{n.message}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground/60">
            {n.role?.toLowerCase() ?? ""}{n.programType ? ` · ${n.programType}` : ""}{n.createdAt ? ` · ${ago(n.createdAt)}` : ""}
          </p>
        </div>
        <ChevronDownIcon className={`size-4 shrink-0 text-muted-foreground/50 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>
      {expanded && (
        <div className="border-t border-border/40 bg-muted/20 px-4 py-3 pl-9 text-sm">
          <p className="text-foreground/90">{n.message}</p>
          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <Detail label="Recipient" value={n.userName} />
            <Detail label="Role" value={n.role?.toLowerCase()} />
            <Detail label="Class" value={n.className ? `${n.className} (${n.classCode ?? "—"})` : "—"} />
            <Detail label="Generation" value={n.generation != null ? `Gen ${n.generation}` : "—"} />
            <Detail label="Program" value={n.programType} />
            <Detail label="Status" value={isUnread(n.status) ? "Unread" : "Read"} />
            <Detail label="Time" value={n.createdAt ? new Date(n.createdAt).toLocaleString() : "—"} />
          </dl>
        </div>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex gap-1.5">
      <dt className="text-muted-foreground/60">{label}:</dt>
      <dd className="font-medium text-foreground/80">{value || "—"}</dd>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: { label: string; value: string }[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`appearance-none rounded-lg border py-1.5 pl-3 pr-7 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 ${
          value ? "border-primary bg-primary/5 text-primary font-medium" : "border-border bg-card text-muted-foreground"
        }`}
      >
        <option value="">{label}</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/70" />
    </div>
  );
}
