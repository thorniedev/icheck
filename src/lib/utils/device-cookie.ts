import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

export const DEVICE_COOKIE = "i-check-device-id";

// ~10 years
const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

export async function getDeviceId(): Promise<string | null> {
  const store = await cookies();
  return store.get(DEVICE_COOKIE)?.value ?? null;
}

/** Reads a cookie value straight from the `Cookie` request header. Works for
 *  both `Request` and `NextRequest` (the latter extends the former). */
function readCookie(req: Request, name: string): string | null {
  const header = req.headers.get("cookie");
  if (!header) return null;

  for (const part of header.split(";")) {
    const [rawKey, ...rawValue] = part.trim().split("=");
    if (rawKey === name) return decodeURIComponent(rawValue.join("="));
  }
  return null;
}

/**
 * Ensures the long-lived per-browser device id cookie exists, creating it if
 * necessary. Returns the (existing or newly-generated) device id.
 *
 * Call this once on first login (OAuth callback) so every subsequent request
 * from this browser carries a stable `deviceId` — used to bind a student's
 * account to a single device.
 */
export function ensureDeviceCookie(req: Request, res: NextResponse): string {
  const existing = readCookie(req, DEVICE_COOKIE);
  if (existing) return existing;

  const id = crypto.randomUUID();
  res.cookies.set({
    name:     DEVICE_COOKIE,
    value:    id,
    httpOnly: true,                              // not readable from JS
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",                             // sent on top-level POST nav (sign-in)
    path:     "/",
    maxAge:   TEN_YEARS,
  });
  return id;
}
