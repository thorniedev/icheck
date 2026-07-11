
export const ATTENDANCE_PUBLIC_URL =
  process.env.NEXT_PUBLIC_ATTENDANCE_URL?.replace(/\/+$/, "") ??
  (typeof window === "undefined"
    ? ""
    : window.location.origin.replace(/\/+$/, ""));
