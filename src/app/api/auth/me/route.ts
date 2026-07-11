import { ACCESS_TOKEN_COOKIE, AUTH_API_URL } from "@/auth";
import { applyRefreshedTokens, refreshTokensFromCookie } from '@/lib/auth/refresh-tokens';
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function getCookie(req: Request, name: string) {
  return req.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

async function fetchMe(accessToken: string) {
  return fetch(`${AUTH_API_URL}/me`, {
    cache: "no-store",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function GET(req: Request) {
  let accessToken = getCookie(req, ACCESS_TOKEN_COOKIE);

  if (!accessToken) {
    // No access cookie at all — try to bootstrap one from the refresh cookie
    // so a returning user with an expired access token still loads cleanly.
    const refreshed = await refreshTokensFromCookie(req);
    if (!refreshed) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }
    accessToken = refreshed.accessToken;
    const res = await fetchMe(accessToken);
    const data = await res.json().catch(() => ({}));
    const out = NextResponse.json(data, { status: res.status });
    applyRefreshedTokens(out, refreshed, new URL(req.url).protocol === "https:");
    return out;
  }

  let res = await fetchMe(accessToken);

  if (res.status === 401) {
    const refreshed = await refreshTokensFromCookie(req);
    if (refreshed) {
      accessToken = refreshed.accessToken;
      res = await fetchMe(accessToken);
      const data = await res.json().catch(() => ({}));
      const out = NextResponse.json(data, { status: res.status });
      applyRefreshedTokens(out, refreshed, new URL(req.url).protocol === "https:");
      return out;
    }
  }

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
