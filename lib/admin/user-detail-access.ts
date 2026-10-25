import { isUuid } from "@/lib/auth/platform-admin";

export type AdminDetailDecision = "allow" | "unauthorized" | "invalid_id";

export function adminUserDetailDecision(
  auth: { ok: boolean },
  userId: string,
): AdminDetailDecision {
  if (!auth.ok) return "unauthorized";
  if (!isUuid(userId)) return "invalid_id";
  return "allow";
}

const SENSITIVE_KEYS = [
  "password",
  "access_token",
  "refresh_token",
  "api_key",
  "secret",
  "cookie",
  "authorization",
];

export function containsSensitiveKey(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some((entry) => containsSensitiveKey(entry));
  return Object.entries(value as Record<string, unknown>).some(([key, nested]) => {
    const normalized = key.toLowerCase();
    if (SENSITIVE_KEYS.some((banned) => normalized.includes(banned))) return true;
    return containsSensitiveKey(nested);
  });
}
