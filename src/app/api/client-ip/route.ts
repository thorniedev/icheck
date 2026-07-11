import { NextResponse } from "next/server";
import { getClientIp } from '@/lib/utils/client-ip';

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return NextResponse.json({ ip: getClientIp(req) });
}
