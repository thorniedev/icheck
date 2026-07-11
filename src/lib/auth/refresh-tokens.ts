import {
  ACCESS_TOKEN_COOKIE,
  ID_TOKEN_COOKIE,
  KEYCLOAK_CLIENT_ID,
  KEYCLOAK_CLIENT_SECRET,
  KEYCLOAK_ISSUER_URI,
  REFRESH_TOKEN_COOKIE,
} from "@/auth";
import type { NextResponse } from "next/server";

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  expires_in?: number;
  refresh_expires_in?: number;
}

export interface RefreshedTokens {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  accessMaxAge: number;
  refreshMaxAge: number;
}

function readCookie(req: Request, name: string): string | null {
  const header = req.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

/**
 * Trades the refresh-token cookie for a fresh access/refresh pair against
 * Keycloak. Returns `null` if there's no refresh cookie or Keycloak rejects
 * the exchange (e.g. refresh expired) — callers should treat that as "user
 * must log in again".
 */
export async function refreshTokensFromCookie(req: Request): Promise<RefreshedTokens | null> {
  const refreshToken = readCookie(req, REFRESH_TOKEN_COOKIE);
  if (!refreshToken) return null;

  const form = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: KEYCLOAK_CLIENT_ID,
    refresh_token: refreshToken,
  });

  const headers: HeadersInit = {
    "Content-Type": "application/x-www-form-urlencoded",
  };
  if (KEYCLOAK_CLIENT_SECRET) {
    headers.Authorization = `Basic ${Buffer.from(
      `${KEYCLOAK_CLIENT_ID}:${KEYCLOAK_CLIENT_SECRET}`
    ).toString("base64")}`;
  }

  try {
    const res = await fetch(`${KEYCLOAK_ISSUER_URI}/protocol/openid-connect/token`, {
      method: "POST",
      headers,
      body: form,
      cache: "no-store",
    });

    if (!res.ok) {
      // Most common: refresh token itself expired → user must re-auth.
      return null;
    }

    const json = (await res.json()) as TokenResponse;
    return {
      accessToken:   json.access_token,
      refreshToken:  json.refresh_token,
      idToken:       json.id_token,
      accessMaxAge:  json.expires_in ?? 300,
      refreshMaxAge: json.refresh_expires_in ?? 1800,
    };
  } catch {
    return null;
  }
}

/** Writes the freshly-rotated tokens onto the outbound response cookies, using
 *  the same flags the OAuth callback uses so the browser overwrites in-place. */
export function applyRefreshedTokens(
  res: NextResponse,
  tokens: RefreshedTokens,
  secure: boolean,
): void {
  res.cookies.set(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: tokens.accessMaxAge,
  });
  if (tokens.refreshToken) {
    res.cookies.set(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: tokens.refreshMaxAge,
    });
  }
  if (tokens.idToken) {
    res.cookies.set(ID_TOKEN_COOKIE, tokens.idToken, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: tokens.accessMaxAge,
    });
  }
}
