import { isSafeInternalPath } from "@/lib/auth/safe-path";

const EMAIL_OTP_TYPES = [
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
] as const;

export type EmailOtpFlow = (typeof EMAIL_OTP_TYPES)[number];

export function isEmailOtpFlow(value: string | null): value is EmailOtpFlow {
  return Boolean(value && (EMAIL_OTP_TYPES as readonly string[]).includes(value));
}

export function buildAuthCallbackUrl(origin: string, next?: string | null): string {
  const base = `${origin.replace(/\/$/, "")}/auth/callback`;
  if (next && isSafeInternalPath(next)) {
    return `${base}?next=${encodeURIComponent(next)}`;
  }
  return base;
}

export function oauthDisplayNameFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
): string | undefined {
  const full =
    (typeof metadata?.full_name === "string" && metadata.full_name) ||
    (typeof metadata?.name === "string" && metadata.name) ||
    "";
  const trimmed = full.trim();
  return trimmed || undefined;
}

export function oauthAvatarFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
): string | undefined {
  const url =
    (typeof metadata?.avatar_url === "string" && metadata.avatar_url) ||
    (typeof metadata?.picture === "string" && metadata.picture) ||
    "";
  const trimmed = url.trim();
  return trimmed || undefined;
}
