import { ACCESS_TOKEN_COOKIE, AUTH_API_URL, mapAuthMe } from "@/auth";

export async function getRequestUser(cookieHeader: string) {
  try {
    const accessToken = cookieHeader
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${ACCESS_TOKEN_COOKIE}=`))
      ?.slice(ACCESS_TOKEN_COOKIE.length + 1);

    if (!accessToken) return null;

    const res = await fetch(`${AUTH_API_URL}/me`, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    return mapAuthMe(await res.json());
  } catch {
    return null;
  }
}
