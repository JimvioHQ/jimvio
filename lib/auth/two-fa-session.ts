/** Cookie set after password/OAuth until TOTP or backup verification succeeds. */
export const TWO_FA_PENDING_COOKIE = "2fa_pending_user";

/** Cookie set only after a successful 2FA challenge for this user id. */
export const TWO_FA_VERIFIED_COOKIE = "2fa_verified";

export const TWO_FA_PENDING_MAX_AGE = 60 * 5;
export const TWO_FA_VERIFIED_MAX_AGE = 60 * 60 * 24 * 7;

export function twoFaCookieBase() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };
}

export function twoFaPendingCookieOptions() {
  return { ...twoFaCookieBase(), maxAge: TWO_FA_PENDING_MAX_AGE };
}

export function twoFaVerifiedCookieOptions() {
  return { ...twoFaCookieBase(), maxAge: TWO_FA_VERIFIED_MAX_AGE };
}

export function isTwoFaChallengePath(pathname: string): boolean {
  return pathname === "/login/2fa" || pathname.startsWith("/login/2fa/");
}

export function cookieMatchesUser(
  cookieValue: string | undefined,
  userId: string,
): boolean {
  return Boolean(cookieValue && cookieValue === userId);
}
