import { API_URL } from '@/lib/api/api-config';

const DEFAULT_ATTENDANCE_SERVICE_URL = "https://attendance.icheck.today";

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function normalizeServiceUrl(value: string) {
  return trimTrailingSlash(value)
    .replace(/\/api\/v1\/attendance$/, "")
    .replace(/\/api\/v1$/, "");
}

function resolveServiceUrl() {
  const configured = normalizeServiceUrl(
    process.env.ATTENDANCE_SERVICE_URL ??
    process.env.BASE_API_URL ??
    process.env.BACKEND_URL ??
    DEFAULT_ATTENDANCE_SERVICE_URL
  );

  if (process.env.NODE_ENV === "production") {
    try {
      const hostname = new URL(configured).hostname;
      if (hostname === "localhost" || hostname === "127.0.0.1") {
        return DEFAULT_ATTENDANCE_SERVICE_URL;
      }
    } catch {
      return DEFAULT_ATTENDANCE_SERVICE_URL;
    }
  }

  return configured;
}

export const SPRING_BOOT_URL = resolveServiceUrl();

export const SPRING_BOOT_PUBLIC_URL = normalizeServiceUrl(
  process.env.ATTENDANCE_PUBLIC_URL ??
  process.env.BACKEND_PUBLIC_URL ??
  process.env.NEXT_PUBLIC_BACKEND_URL ??
  SPRING_BOOT_URL
);

export const BASE_API_URL =
  `${SPRING_BOOT_URL}/api/v1`;

export const ATTENDANCE_API_URL = `${SPRING_BOOT_URL}${API_URL}`;

export const AUTH_API_URL = `${SPRING_BOOT_URL}/api/v1/users`;

export const KEYCLOAK_ISSUER_URI = trimTrailingSlash(
  process.env.KEYCLOAK_ISSUER_URI ??
  process.env.NEXT_PUBLIC_KEYCLOAK_ISSUER_URI ??
  "https://iam.icheck.today/realms/icheck"
);

export const KEYCLOAK_CLIENT_ID =
  process.env.KEYCLOAK_CLIENT_ID ??
  process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID ??
  "icheck";

export const KEYCLOAK_CLIENT_SECRET =
  process.env.KEYCLOAK_CLIENT_SECRET ??
  process.env.KEYCLOAK_SECRET ??
  process.env.AUTH_KEYCLOAK_SECRET ??
  "";

export const OAUTH_STATE_SECRET =
  process.env.OAUTH_STATE_SECRET ??
  process.env.KEYCLOAK_CLIENT_SECRET ??
  process.env.KEYCLOAK_SECRET ??
  process.env.AUTH_KEYCLOAK_SECRET ??
  "icheck-local-oauth-state-secret";

export const ACCESS_TOKEN_COOKIE = "icheck_access_token";
export const REFRESH_TOKEN_COOKIE = "icheck_refresh_token";
export const ID_TOKEN_COOKIE = "icheck_id_token";
export const OAUTH_STATE_COOKIE = "icheck_oauth_state";
export const OAUTH_CODE_VERIFIER_COOKIE = "icheck_oauth_code_verifier";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: string;
  displayRole: string;
  rawRoles: string[];
  profileImage: string | null;
}

const ROLE_PRIORITY = ["PLATFORM_ADMIN", "ORG_ADMIN", "ADMIN", "TEACHER", "STUDENT"] as const;

function normalizeRole(raw: string): string {
  const upper = raw?.toUpperCase?.() ?? "";
  if (upper === "SUPER_ADMIN" || upper === "SUPERADMIN") return "ADMIN";
  if (upper === "PLATFORM_ADMIN" || upper === "ORG_ADMIN") return "ADMIN";
  return upper || "USER";
}

function humanizeRole(raw: string): string {
  const upper = raw?.toUpperCase?.() ?? "";
  if (upper === "SUPER_ADMIN" || upper === "SUPERADMIN") return "Super Admin";
  if (upper === "PLATFORM_ADMIN") return "Platform Admin";
  if (upper === "ORG_ADMIN") return "Organization Admin";
  if (upper === "ADMIN")   return "Admin";
  if (upper === "TEACHER") return "Teacher";
  if (upper === "STUDENT") return "Student";

  return upper
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

function pickDisplayRoleRaw(rawRoles: string[]): string {
  const upper = rawRoles.map((r) => r.toUpperCase());
  if (upper.some((r) => r === "SUPER_ADMIN" || r === "SUPERADMIN")) return "SUPER_ADMIN";
  if (upper.includes("PLATFORM_ADMIN")) return "PLATFORM_ADMIN";
  if (upper.includes("ORG_ADMIN")) return "ORG_ADMIN";
  if (upper.includes("ADMIN"))   return "ADMIN";
  if (upper.includes("TEACHER")) return "TEACHER";
  if (upper.includes("STUDENT")) return "STUDENT";
  return rawRoles[0] ?? "USER";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapAuthMe(p: any): AppUser | null {
  if (p?.payload && typeof p.payload === "object") {
    p = p.payload;
  }
  if (!p || typeof p !== "object") return null;
  const username = p.username ?? p.preferred_username ?? p.name ?? "";
  const email    = p.email ?? "";
  if (!username && !email) return null;

  const rawRoles: string[] = Array.isArray(p.roles)
    ? p.roles.map(String)
    : p.role ? [String(p.role)]
    : p.roleName ? [String(p.roleName)]
    : [];

  const normalized = rawRoles.map(normalizeRole);
  const role =
    ROLE_PRIORITY.find((r) => normalized.includes(r)) ??
    normalized[0] ??
    "USER";

  return {
    id:    String(p.id ?? (username || email)),
    name:  String(p.name ?? (username || email)),
    email: String(email),
    role,
    displayRole: humanizeRole(pickDisplayRoleRaw(rawRoles)),
    rawRoles,
    profileImage: p.profileImage ? String(p.profileImage) : null,
  };
}
