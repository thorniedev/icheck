import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ensureDeviceCookie } from "@/lib/utils/device-cookie";

export default function middleware(req: NextRequest): NextResponse {
  const res = NextResponse.next();
  ensureDeviceCookie(req, res);
  return res;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|robots.txt).*)"],
};
