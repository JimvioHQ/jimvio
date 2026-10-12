/** Signup email OTP helpers. The code itself always comes from Supabase Auth. */

export const OTP_LIFETIME_MS = 10 * 60 * 1000;
export const OTP_RESEND_COOLDOWN_MS = 60_000;
export const SIGNUP_OTP_STORAGE_KEY = "jimvio-signup-otp";

export function normalizeOtpToken(value: string): string {
  return value.replace(/\D/g, "").slice(0, 6);
}

export function otpRemainingMs(issuedAt: number, now: number): number {
  if (!Number.isFinite(issuedAt) || issuedAt <= 0) return 0;
  return Math.max(0, issuedAt + OTP_LIFETIME_MS - now);
}

export function formatOtpCountdown(remainingMs: number): string {
  const total = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function mapSignupOtpError(error: {
  code?: string | null;
  message?: string | null;
  status?: number | null;
}): string {
  const code = String(error.code ?? "").toLowerCase();
  const message = String(error.message ?? "").toLowerCase();
  if (code === "otp_expired" || message.includes("expired")) {
    return "This code has expired. Request a new one.";
  }
  if (code.includes("rate") || message.includes("rate limit") || error.status === 429) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  if (message.includes("network") || message.includes("fetch failed") || message.includes("failed to fetch")) {
    return "We couldn't reach the verification service. Try again.";
  }
  return "That code is not valid. Check the email and try again.";
}
