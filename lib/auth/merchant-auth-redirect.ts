import {
  isPlatformDestinationPath,
  MERCHANT_POST_LOGIN_PATH,
} from "@/lib/auth/post-login-redirect";
import { sanitizeAuthenticatedNext } from "@/lib/auth/recovery-session";
import { isSafeInternalPath } from "@/lib/auth/safe-path";

/**
 * Canonical merchant-storefront post-auth destination.
 *
 * Use for every login / register / callback / 2FA / logout resume on
 * `{handle}.jimvio.com`. Never trust absolute URLs or platform paths.
 */
export function resolveMerchantAuthRedirect(
  requestedNext?: string | null,
): string {
  const sanitized = sanitizeAuthenticatedNext(requestedNext);
  if (!sanitized) return MERCHANT_POST_LOGIN_PATH;
  if (!isSafeInternalPath(sanitized)) return MERCHANT_POST_LOGIN_PATH;
  if (isPlatformDestinationPath(sanitized)) return MERCHANT_POST_LOGIN_PATH;
  return sanitized;
}

/** Absolute URL on the trusted merchant (or platform) origin for a safe path. */
export function merchantAuthAbsoluteUrl(
  origin: string,
  requestedNext?: string | null,
): string {
  const path = resolveMerchantAuthRedirect(requestedNext);
  const base = origin.replace(/\/$/, "");
  return `${base}${path}`;
}
