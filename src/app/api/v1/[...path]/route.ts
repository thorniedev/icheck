import { NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE, BASE_API_URL } from "@/auth";
import { applyRefreshedTokens, refreshTokensFromCookie } from '@/lib/auth/refresh-tokens';

/**
 * Generic authenticated proxy for the RTK Query `baseApi` (`baseUrl: "/api/v1"`).
 *
 * The attendance-service backend is an OAuth2 resource server that only accepts
 * a JWT via the `Authorization: Bearer <token>` header — it ignores cookies.
 * Our access token is stored in an httpOnly cookie (`icheck_access_token`), so
 * client-side `fetch`/RTK Query calls can never attach it directly. This route
 * reads the cookie server-side and forwards the request to the real backend
 * with the bearer token attached, returning the response as-is.
 *
 * Without this, every `/api/v1/*` call from `baseApi` (settings, classrooms,
 * reports, sessions, QR codes, etc.) hits the backend with no credentials and
 * gets `401 Unauthorized`.
 */

export const dynamic = "force-dynamic";

function getCookie(req: Request, name: string) {
  return req.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

async function proxy(req: Request, path: string[]) {
  const url = new URL(req.url);
  const target = `${BASE_API_URL}/${path.map(encodeURIComponent).join("/")}${url.search}`;

  // Cache the body once so we can replay it for a refresh-then-retry without
  // having to re-read the stream (which is one-shot on a Request).
  let bodyBuf: ArrayBuffer | undefined;
  if (req.method !== "GET" && req.method !== "HEAD") {
    const body = await req.arrayBuffer();
    if (body.byteLength > 0) bodyBuf = body;
  }

  const baseHeaders: Record<string, string> = {};
  const contentType = req.headers.get("content-type");
  if (contentType) baseHeaders["Content-Type"] = contentType;
  const accept = req.headers.get("accept");
  if (accept) baseHeaders["Accept"] = accept;

  async function fetchUpstream(accessToken: string | undefined): Promise<Response> {
    const headers: Record<string, string> = { ...baseHeaders };
    if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
    return fetch(target, {
      method: req.method,
      headers,
      body: bodyBuf,
      cache: "no-store",
    });
  }

  let accessToken = getCookie(req, ACCESS_TOKEN_COOKIE);
  let res: Response;
  try {
    res = await fetchUpstream(accessToken);
  } catch {
    return NextResponse.json(
      { error: "Upstream attendance service unreachable." },
      { status: 502 }
    );
  }

  // Access-token expired? Swap it for a fresh one via the refresh-token cookie
  // and retry once. The refreshed tokens are written to the outbound response
  // so the browser keeps the rotation in lockstep.
  let refreshedCookiesOnOutbound = false;
  if (res.status === 401) {
    const refreshed = await refreshTokensFromCookie(req);
    if (refreshed) {
      accessToken = refreshed.accessToken;
      try {
        res = await fetchUpstream(accessToken);
        refreshedCookiesOnOutbound = true;
        const responseHeaders = new Headers();
        const resContentType = res.headers.get("content-type");
        if (resContentType) responseHeaders.set("content-type", resContentType);

        if (res.status === 204 || res.status === 304) {
          const out = new NextResponse(null, { status: res.status, headers: responseHeaders });
          applyRefreshedTokens(out, refreshed, new URL(req.url).protocol === "https:");
          return out;
        }

        const buf = await res.arrayBuffer();
        const out = new NextResponse(buf, { status: res.status, headers: responseHeaders });
        applyRefreshedTokens(out, refreshed, new URL(req.url).protocol === "https:");
        return out;
      } catch {
        // fall through to the 401 response below
      }
    }
  }

  if (res.status === 204 || res.status === 304) {
    return new NextResponse(null, { status: res.status });
  }

  const responseHeaders = new Headers();
  const resContentType = res.headers.get("content-type");
  if (resContentType) responseHeaders.set("content-type", resContentType);

  const buf = await res.arrayBuffer();
  const out = new NextResponse(buf, { status: res.status, headers: responseHeaders });
  // Quiet the "unused" warning when refresh isn't triggered.
  void refreshedCookiesOnOutbound;
  return out;
}

type RouteContext = { params: Promise<{ path: string[] }> };

async function handle(req: Request, context: RouteContext) {
  const { path } = await context.params;
  return proxy(req, path);
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
