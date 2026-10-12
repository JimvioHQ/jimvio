import { createHash } from "node:crypto";

/** Matches Supabase Auth `smtp_max_frequency` (seconds between messages). */
export const SIGNUP_RESEND_COOLDOWN_SECONDS = 60;

/** Extra sends allowed for one address inside the 10-minute OTP lifetime. */
export const SIGNUP_RESEND_EMAIL_WINDOW_LIMIT = 5;
export const SIGNUP_RESEND_EMAIL_WINDOW_SECONDS = 600;

/** Shared-network cap. Addresses are still limited on their own. */
export const SIGNUP_RESEND_IP_WINDOW_LIMIT = 8;
export const SIGNUP_RESEND_IP_WINDOW_SECONDS = 600;

export const AUTH_RESEND_COOLDOWN_MESSAGE =
  "Please wait a moment before requesting another email.";

export function authEmailSendBucket(scope: "email" | "ip", value: string): string {
  return createHash("sha256").update(`${scope}:${value}`).digest("hex");
}

export type SendWindow = { startedAt: number; hits: number };

/**
 * Same window rule as the database guard: one row per bucket, reset after the window.
 * A newly issued Supabase confirmation or recovery code replaces the previous code.
 */
export function nextSendWindow(
  state: SendWindow | null,
  now: number,
  limit: number,
  windowMs: number,
): { allowed: boolean; state: SendWindow } {
  if (!state || now - state.startedAt >= windowMs) {
    return { allowed: limit >= 1, state: { startedAt: now, hits: 1 } };
  }
  const hits = state.hits + 1;
  return { allowed: hits <= limit, state: { startedAt: state.startedAt, hits } };
}
