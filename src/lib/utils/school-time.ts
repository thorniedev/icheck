
export const SCHOOL_TZ =
  process.env.SCHOOL_TZ ??
  process.env.NEXT_PUBLIC_SCHOOL_TZ ??
  "Asia/Phnom_Penh";

const DAY_NAMES = [
  "SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY",
  "THURSDAY", "FRIDAY", "SATURDAY",
] as const;
export type WeekdayName = typeof DAY_NAMES[number];

/** YYYY-MM-DD in the school's timezone (for comparing with `sessionDate`). */
export function todayIso(now: Date = new Date()): string {
  // en-CA gives us ISO order: YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SCHOOL_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function todayWeekday(now: Date = new Date()): WeekdayName {
  const name = new Intl.DateTimeFormat("en-US", {
    timeZone: SCHOOL_TZ,
    weekday: "long",
  }).format(now).toUpperCase();
  
  // Narrow to our union — if Intl ever returns something off, default to MONDAY.
  return (DAY_NAMES as readonly string[]).includes(name)
    ? (name as WeekdayName)
    : "MONDAY";
}

/** Convenience — both at once, computed from the same moment. */
export function schoolToday(): { iso: string; weekday: WeekdayName } {
  const now = new Date();
  return { iso: todayIso(now), weekday: todayWeekday(now) };
}

export function schoolNowMinutes(now: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: SCHOOL_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  return hour * 60 + minute;
}

export function timeToMinutes(t?: string | null): number | null {
  if (!t) return null;
  const [hStr, mStr = "0"] = t.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

/** "08:00:00" or "08:00" -> "8:00 AM". Returns "—" for null/empty/unparseable input. */
export function formatTime12(t?: string | null): string {
  if (!t) return "—";
  const [hStr, mStr] = t.split(":");
  const h = Number(hStr);
  const m = Number(mStr ?? 0);
  if (Number.isNaN(h) || Number.isNaN(m)) return t;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}
