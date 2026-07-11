/**
 * Best-effort extraction of the originating client IP from a Next.js
 * server-side `Request`. Used by the attendance check-in proxy routes so the
 * backend's optional IP/CIDR allowlist (Rule 11, `ip_validation_enabled`)
 * has something real to validate against.
 *
 * Client-side JS cannot read its own public IP, so this MUST run on the
 * server (route handler), where the platform / reverse proxy attaches
 * forwarding headers.
 */
export function getClientIp(req: Request): string | null {
  const headers = req.headers;

  // Standard proxy header — may contain a comma-separated chain
  // ("client, proxy1, proxy2"); the first entry is the original client.
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }

  // Common alternatives set by various proxies / platforms.
  const candidates = [
    headers.get("x-real-ip"),
    headers.get("cf-connecting-ip"), // Cloudflare
    headers.get("true-client-ip"),
    headers.get("x-client-ip"),
  ];
  for (const candidate of candidates) {
    if (candidate && candidate.trim()) return candidate.trim();
  }

  return null;
}
