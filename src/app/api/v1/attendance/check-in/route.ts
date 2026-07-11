import { NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE, ATTENDANCE_API_URL } from "@/auth";
import { getDeviceId } from "@/lib/device-cookie";
import { getRequestUser } from "@/lib/server-user";
import { getClientIp } from "@/lib/client-ip";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const cookieHeader = req.headers.get("cookie") ?? "";
  const accessToken = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${ACCESS_TOKEN_COOKIE}=`))
    ?.slice(ACCESS_TOKEN_COOKIE.length + 1);
  const user = await getRequestUser(cookieHeader);

  if (!accessToken || !user) {
    return NextResponse.json(
      { success: false, message: "Your session has expired. Please log in again, then re-scan." },
      { status: 401 }
    );
  }
  if (user.role !== "STUDENT") {
    return NextResponse.json(
      {
        success: false,
        message: `Only a student account can check in. You're signed in as ${user.role.toLowerCase()} — log in with the student account on this device.`,
      },
      { status: 403 }
    );
  }

  const deviceId = await getDeviceId();
  if (!deviceId) {
    return NextResponse.json(
      { success: false, message: "Missing device cookie. Please reload the page." },
      { status: 400 }
    );
  }

  const body = await req.json();
  // The frontend tells us whether this scan is for a static (classroom-printed)
  // QR or a dynamic (teacher-projected) one — they hit different backend
  // endpoints with different validation rules. Default to dynamic if omitted.
  const kind: "static" | "dynamic" = body.kind === "static" ? "static" : "dynamic";
  const endpoint =
    kind === "static" ? "/attendances/static-qr-check-in" : "/attendances/dynamic-qr-check-in";

  const payload: Record<string, unknown> = {
    studentId: Number(user.id),
    qrToken:   body.qrToken,
    deviceId,
    latitude:  body.latitude  ?? null,
    longitude: body.longitude ?? null,
    // IP validation (Rule 11, optional/admin-toggle): the client can't see
    // its own public IP, so the server reads it from proxy/request headers.
    ipAddress: body.ipAddress ?? getClientIp(req),
  };
  if (kind === "static") {
    // Static QR: on-time scans need no reason (fast scan). Only a LATE scan
    // requires one — the backend rejects those with 400 "A reason is required
    // when checking in late via static QR", which the client turns into the
    // reason prompt. Forward whatever reason we have (empty on the first try).
    payload.reason = body.reason ?? "";
  }

  const res = await fetch(`${ATTENDANCE_API_URL}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok && typeof data?.message === "string" && /school network/i.test(data.message)) {
    data.message = `${data.message} — your IP is ${payload.ipAddress ?? "unknown"}. Ask the admin to add it to the allowlist.`;
  }
  return NextResponse.json(data, { status: res.status });
}
