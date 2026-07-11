export type QrKind = "static" | "dynamic";

export interface ParsedQr {
  /** The raw QR token the backend understands, or null if unreadable. */
  token: string | null;
  /** Which check-in endpoint to hit. Defaults to "dynamic". */
  kind: QrKind;
}

/**
 * Students may scan either the teacher's projected **dynamic** QR or the printed
 * classroom **static** QR. Both encode a full check-in URL:
 *
 *   dynamic → https://icheck.today/check-in?token=<uuid>
 *   static  → https://icheck.today/check-in?token=<uuid>&kind=static
 *
 * The phone's native camera opens that URL directly (so the `/check-in` page
 * parses `token` itself). But the in-app scanner only gets the decoded *string*,
 * so it has to pull the token out — the previous version sent the whole URL as
 * the token, which the backend never recognised (the "scan not working" bug).
 *
 * This extracts `{ token, kind }` from a full URL, a relative `/check-in?…`,
 * a bare `token=…&kind=…` query string, or a plain token. Never throws.
 */
export function parseQrPayload(decoded: string | null | undefined): ParsedQr {
  const raw = (decoded ?? "").trim();
  if (!raw) return { token: null, kind: "dynamic" };

  // 1. Absolute or relative URL carrying ?token=...&kind=...
  const fromUrl = extractFromUrl(raw);
  if (fromUrl.token) return fromUrl;

  // 2. A bare query string ("token=abc&kind=static" or "?token=abc")
  if (raw.includes("token=")) {
    const params = new URLSearchParams(raw.replace(/^\?/, ""));
    const token = params.get("token");
    if (token) return { token, kind: params.get("kind") === "static" ? "static" : "dynamic" };
  }

  // 3. Looked like a link but had no usable token → treat as unreadable.
  if (/^https?:\/\//i.test(raw) || raw.toLowerCase().includes("/check-in")) {
    return { token: null, kind: "dynamic" };
  }

  // 4. Plain token (e.g. a UUID). Kind is unknown → default dynamic; the backend
  //    validates the token type and rejects a mismatch.
  return { token: raw, kind: "dynamic" };
}

function extractFromUrl(raw: string): ParsedQr {
  // Absolute URL (has scheme + host)
  try {
    const token = new URL(raw).searchParams.get("token");
    if (token) return { token, kind: kindFromUrl(raw) };
  } catch {
    /* not an absolute URL — fall through */
  }
  // Relative URL like "/check-in?token=..." — resolve against a dummy base.
  if (raw.startsWith("/") || raw.toLowerCase().includes("check-in?")) {
    try {
      const url = new URL(raw, "https://placeholder.local");
      const token = url.searchParams.get("token");
      if (token) return { token, kind: url.searchParams.get("kind") === "static" ? "static" : "dynamic" };
    } catch {
      /* ignore */
    }
  }
  return { token: null, kind: "dynamic" };
}

function kindFromUrl(raw: string): QrKind {
  try {
    return new URL(raw).searchParams.get("kind") === "static" ? "static" : "dynamic";
  } catch {
    return "dynamic";
  }
}
