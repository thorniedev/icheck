import {
  ACCESS_TOKEN_COOKIE,
  AUTH_API_URL,
  BASE_API_URL,
  ID_TOKEN_COOKIE,
  KEYCLOAK_CLIENT_ID,
  KEYCLOAK_CLIENT_SECRET,
  KEYCLOAK_ISSUER_URI,
  OAUTH_CODE_VERIFIER_COOKIE,
  OAUTH_STATE_SECRET,
  OAUTH_STATE_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from "@/auth";
import { ensureDeviceCookie } from '@/lib/utils/device-cookie';
import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Single-shot guard so a transient state mismatch auto-restarts the login
 *  exactly once instead of dead-ending (and never loops on a real misconfig). */
const OAUTH_RETRY_COOKIE = "icheck_oauth_retry";

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  expires_in?: number;
  refresh_expires_in?: number;
}

function getCookie(req: Request, name: string) {
  return req.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

function sign(value: string) {
  return createHmac("sha256", OAUTH_STATE_SECRET)
    .update(value)
    .digest("base64url");
}

function verifySignedState(state: string | null) {
  if (!state) return null;

  const [payload, signature] = state.split(".");
  if (!payload || !signature) return null;

  const expected = sign(payload);
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);
  if (
    expectedBuffer.length !== signatureBuffer.length ||
    !timingSafeEqual(expectedBuffer, signatureBuffer)
  ) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      codeVerifier?: string;
    };
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const requestUrl = new URL(req.url);
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  const signedState = verifySignedState(state);
  const savedState = getCookie(req, OAUTH_STATE_COOKIE);
  const codeVerifier = signedState?.codeVerifier ?? getCookie(req, OAUTH_CODE_VERIFIER_COOKIE);
  const isLocalhost = requestUrl.hostname === "localhost" || requestUrl.hostname === "127.0.0.1";

  if (!code || !codeVerifier || (!signedState && !isLocalhost && (!state || !savedState || state !== savedState))) {
    console.error("[oauth/callback] state mismatch", {
      host: requestUrl.host,
      hasCode: !!code,
      hasState: !!state,
      hasSignedState: !!signedState,
      hasSavedState: !!savedState,
      hasCodeVerifier: !!codeVerifier,
      stateMatch: state === savedState,
      isLocalhost,
    });

    // Most state mismatches are transient: a stale/abandoned login cookie, a
    // prefetched login route overwriting the state, or the state cookie not
    // surviving the cross-site bounce. The old behaviour dead-ended at the
    // error page, so the user had to manually refresh (which simply restarts
    // the login and succeeds). Do that automatically — restart the login flow
    // ONCE. A guard cookie prevents an infinite loop if the failure is a real
    // misconfiguration (then we show the error page).
    const alreadyRetried = getCookie(req, OAUTH_RETRY_COOKIE) === "1";
    if (!alreadyRetried) {
      const retry = NextResponse.redirect(new URL("/api/auth/login", requestUrl.origin));
      // Clear the stale state/verifier so the fresh login starts clean.
      retry.cookies.delete(OAUTH_STATE_COOKIE);
      retry.cookies.delete(OAUTH_CODE_VERIFIER_COOKIE);
      retry.cookies.set(OAUTH_RETRY_COOKIE, "1", {
        httpOnly: true,
        sameSite: "lax",
        secure: requestUrl.protocol === "https:",
        path: "/",
        maxAge: 120,
      });
      return retry;
    }

    // Second failure in a row → genuine problem; show the error page.
    const response = NextResponse.redirect(new URL("/login?error=oauth_state", requestUrl.origin));
    response.cookies.delete(OAUTH_STATE_COOKIE);
    response.cookies.delete(OAUTH_CODE_VERIFIER_COOKIE);
    response.cookies.delete(OAUTH_RETRY_COOKIE);
    return response;
  }

  // Loud config sanity-check — most common cause of token_exchange failure.
  if (!KEYCLOAK_CLIENT_SECRET) {
    console.error(
      "[oauth/callback] KEYCLOAK_CLIENT_SECRET env var is empty. " +
      "If your Keycloak client is confidential, token exchange will return 401."
    );
  }

  const redirectUri = new URL("/api/auth/callback/keycloak", requestUrl.origin);
  const form = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: KEYCLOAK_CLIENT_ID,
    code,
    redirect_uri: redirectUri.toString(),
    code_verifier: codeVerifier,
  });

  const headers: HeadersInit = {
    "Content-Type": "application/x-www-form-urlencoded",
  };
  if (KEYCLOAK_CLIENT_SECRET) {
    headers.Authorization = `Basic ${Buffer.from(
      `${KEYCLOAK_CLIENT_ID}:${KEYCLOAK_CLIENT_SECRET}`
    ).toString("base64")}`;
  }

  const tokenUrl = `${KEYCLOAK_ISSUER_URI}/protocol/openid-connect/token`;
  const tokenRes = await fetch(tokenUrl, {
    method: "POST",
    headers,
    body: form,
    cache: "no-store",
  });

  if (!tokenRes.ok) {
    // Read the body so Vercel logs actually tell you "invalid_client", "invalid_grant", etc.
    const body = await tokenRes.text().catch(() => "");
    let detail = "unknown";
    try {
      const parsed = JSON.parse(body) as {
        error?: string;
        error_description?: string;
      };
      detail = parsed.error_description ?? parsed.error ?? "unknown";
    } catch {
      detail = body || "unknown";
    }
    console.error("[oauth/callback] token exchange failed", {
      tokenUrl,
      status: tokenRes.status,
      body,
      clientId: KEYCLOAK_CLIENT_ID,
      hasSecret: !!KEYCLOAK_CLIENT_SECRET,
      redirectUri: redirectUri.toString(),
    });

    // `invalid_grant` ("Code not valid" / "Code already used" / expired) is a
    // transient code problem — the authorization code was reused (double
    // callback hit, refreshed callback URL, or a stale code). A fresh login
    // mints a new code that exchanges cleanly, so auto-restart the flow ONCE
    // (guarded so a real config error like invalid_client still surfaces).
    let parsedError = "";
    try { parsedError = (JSON.parse(body) as { error?: string }).error ?? ""; } catch { /* ignore */ }
    const isCodeProblem =
      parsedError === "invalid_grant" || /code not valid|code.*expired|already/i.test(detail);
    const alreadyRetried = getCookie(req, OAUTH_RETRY_COOKIE) === "1";

    if (isCodeProblem && !alreadyRetried) {
      const retry = NextResponse.redirect(new URL("/api/auth/login", requestUrl.origin));
      retry.cookies.delete(OAUTH_STATE_COOKIE);
      retry.cookies.delete(OAUTH_CODE_VERIFIER_COOKIE);
      retry.cookies.set(OAUTH_RETRY_COOKIE, "1", {
        httpOnly: true,
        sameSite: "lax",
        secure: requestUrl.protocol === "https:",
        path: "/",
        maxAge: 120,
      });
      return retry;
    }

    const errorUrl = new URL("/login", requestUrl.origin);
    errorUrl.searchParams.set("error", "token_exchange");
    errorUrl.searchParams.set("detail", detail.slice(0, 160));
    const errResp = NextResponse.redirect(errorUrl);
    errResp.cookies.delete(OAUTH_RETRY_COOKIE);
    return errResp;
  }

  const token = (await tokenRes.json()) as TokenResponse;
  // Honor a safe post-login return (e.g. a student whose session expired mid
  // check-in) — only same-origin /check-in paths are allowed to avoid open
  // redirects.
  const rawReturn = getCookie(req, "post_login_redirect");
  const decodedReturn = rawReturn ? decodeURIComponent(rawReturn) : "";
  let dest = decodedReturn.startsWith("/check-in") ? decodedReturn : "/";
  try {
    const onboardingRes = await fetch(`${BASE_API_URL}/onboarding/status`, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    if (onboardingRes.ok) {
      const onboardingJson = await onboardingRes.json() as {
        needsOnboarding?: boolean;
        payload?: { needsOnboarding?: boolean };
      };
      if (onboardingJson.payload?.needsOnboarding || onboardingJson.needsOnboarding) {
        dest = "/onboarding";
      }
    }
  } catch (e) {
    console.error("[oauth/callback] onboarding status check failed", e);
  }
  const response = NextResponse.redirect(new URL(dest, requestUrl.origin));
  const secure = requestUrl.protocol === "https:";

  response.cookies.delete(OAUTH_STATE_COOKIE);
  response.cookies.delete(OAUTH_CODE_VERIFIER_COOKIE);
  response.cookies.delete(OAUTH_RETRY_COOKIE); // login succeeded — reset the guard
  response.cookies.delete("post_login_redirect");
  response.cookies.set(ACCESS_TOKEN_COOKIE, token.access_token, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: token.expires_in ?? 300,
  });

  if (token.refresh_token) {
    response.cookies.set(REFRESH_TOKEN_COOKIE, token.refresh_token, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: token.refresh_expires_in ?? 1800,
    });
  }

  if (token.id_token) {
    response.cookies.set(ID_TOKEN_COOKIE, token.id_token, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: token.expires_in ?? 300,
    });
  }

  // Bind/verify this browser's device for the logged-in account. Students get
  // locked to the first device they ever sign in from; if this device doesn't
  // match a previously-bound one, the backend rejects the binding and we abort
  // the login (clearing the auth cookies we just set).
  const deviceId = ensureDeviceCookie(req, response);
  try {
    const deviceRes = await fetch(`${AUTH_API_URL}/me/device`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token.access_token}`,
      },
      body: JSON.stringify({ deviceId }),
      cache: "no-store",
    });

    if (deviceRes.status === 401) {
      const blocked = NextResponse.redirect(new URL("/login?error=device_mismatch", requestUrl.origin));
      blocked.cookies.delete(ACCESS_TOKEN_COOKIE);
      blocked.cookies.delete(REFRESH_TOKEN_COOKIE);
      blocked.cookies.delete(ID_TOKEN_COOKIE);
      return blocked;
    }

    if (!deviceRes.ok) {
      const body = await deviceRes.text().catch(() => "");
      console.error("[oauth/callback] device binding check failed", {
        status: deviceRes.status,
        body,
      });
    }
  } catch (e) {
    // Fail open — don't block login if the device-binding call itself errors
    // (e.g. backend briefly unreachable).
    console.error("[oauth/callback] device binding request error", e);
  }

  return response;
}
