
import { cookies } from "next/headers";
import { ACCESS_TOKEN_COOKIE, ATTENDANCE_API_URL, SPRING_BOOT_URL } from "@/auth";

export async function backendFetch(
  path: string,
  init?: RequestInit
): Promise<Response> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;

  const headers: Record<string, string> = {
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...(init?.headers as Record<string, string> | undefined),
  };

  const url = path.startsWith("/api/")
    ? `${SPRING_BOOT_URL}${path}`
    : `${ATTENDANCE_API_URL}${path}`;

  return fetch(url, {
    cache: "no-store",
    ...init,
    headers,
  });
}
