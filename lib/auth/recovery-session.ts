import { isSafeInternalPath } from "@/lib/auth/safe-path";

/** HttpOnly flag that a verified password-recovery exchange just succeeded. Never log the value. */
export const PASSWORD_RECOVERY_COOKIE = "password_recovery_user";

export const PASSWORD_RECOVERY_MAX_AGE = 60 * 15;

/** GoTrue AMR method for account recovery — not generic otp/oauth/password. */
export const RECOVERY_AMR_METHOD = "recovery";

export function passwordRecoveryCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: PASSWORD_RECOVERY_MAX_AGE,
  };
}

export function isPasswordResetPath(pathname: string): boolean {
  return pathname === "/reset-password" || pathname.startsWith("/reset-password/");
}

export function isCompletePath(pathname: string): boolean {
  return pathname === "/complete" || pathname === "/auth/complete";
}

/** 2FA may be skipped only while finishing password reset — never on app routes. */
export function isRecoveryTwoFaExemptPath(pathname: string): boolean {
  return isPasswordResetPath(pathname);
}

export function isAuthCompletionPath(path: string): boolean {
  const p = path.trim().split("?")[0] ?? "";
  return (
    p === "/reset-password" ||
    p === "/verify" ||
    p === "/complete" ||
    p === "/auth/complete"
  );
}

/**
 * Destinations after a normal login/OAuth. Recovery paths must not be honored
 * as `next` — they are not proof of a recovery grant.
 */
export function sanitizeAuthenticatedNext(next?: string | null): string | undefined {
  if (!next) return undefined;
  const trimmed = next.trim();
  if (!isSafeInternalPath(trimmed)) return undefined;
  if (isPasswordResetPath(trimmed)) return undefined;
  if (isCompletePath(trimmed)) return undefined;
  return trimmed;
}

export function recoveryDestination(next?: string | null): string {
  if (next && isSafeInternalPath(next) && isPasswordResetPath(next)) return next;
  return "/reset-password";
}

export function claimsIndicatePasswordRecovery(claims: unknown): boolean {
  if (!claims || typeof claims !== "object") return false;
  const amr = (claims as { amr?: unknown }).amr;
  if (!Array.isArray(amr)) return false;
  return amr.some((entry) => {
    if (typeof entry === "string") return entry === RECOVERY_AMR_METHOD;
    if (entry && typeof entry === "object" && "method" in entry) {
      return (entry as { method?: unknown }).method === RECOVERY_AMR_METHOD;
    }
    return false;
  });
}

function jsonFromBase64Url(segment: string): unknown {
  const padded = segment.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  return JSON.parse(binary);
}

/** Decode-only check of a GoTrue access token payload. Caller must already trust the session. */
export function accessTokenHasRecoveryAmr(
  accessToken: string | null | undefined,
): boolean {
  if (!accessToken) return false;
  const parts = accessToken.split(".");
  if (parts.length < 2) return false;
  try {
    return claimsIndicatePasswordRecovery(jsonFromBase64Url(parts[1]!));
  } catch {
    return false;
  }
}

/**
 * PKCE code-verifier cookie is stored as `{verifier}/recovery` only when
 * resetPasswordForEmail started the flow — not for Google OAuth.
 */
export function pkceRedirectTypeIsRecovery(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  return (data as { redirectType?: unknown }).redirectType === "recovery";
}
