import { createHmac, timingSafeEqual } from "crypto";

/** Cookie set after password/OAuth until TOTP or backup verification succeeds. */
export const TWO_FA_PENDING_COOKIE = "2fa_pending_user";

/** Cookie set only after a successful 2FA challenge for this user id. */
export const TWO_FA_VERIFIED_COOKIE = "2fa_verified";

export const TWO_FA_PENDING_MAX_AGE = 60 * 5;
export const TWO_FA_VERIFIED_MAX_AGE = 60 * 60 * 24 * 7;

const TWO_FA_COOKIE_VERSION = "v1";

function twoFaSigningSecret(): string {
  const secret =
    process.env.TWO_FA_COOKIE_SECRET?.trim() ||
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    "";
  if (!secret) {
    throw new Error("Missing TWO_FA_COOKIE_SECRET (or Supabase secret key) for 2FA cookie signing.");
  }
  return secret;
}

function signPayload(payload: string): string {
  return createHmac("sha256", twoFaSigningSecret()).update(payload).digest("base64url");
}

/**
 * Signed proof: v1.<userId>.<expUnix>.<sig>
 * Binds verification to user id + expiry. Not forgeable without the server secret.
 */
export function createTwoFaVerifiedToken(
  userId: string,
  maxAgeSeconds = TWO_FA_VERIFIED_MAX_AGE,
): string {
  const exp = Math.floor(Date.now() / 1000) + maxAgeSeconds;
  const payload = `${TWO_FA_COOKIE_VERSION}.${userId}.${exp}`;
  return `${payload}.${signPayload(payload)}`;
}

export function parseTwoFaVerifiedToken(
  token: string | undefined,
): { userId: string; exp: number } | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [version, userId, expRaw, sig] = parts;
  if (version !== TWO_FA_COOKIE_VERSION || !userId || !expRaw || !sig) return null;
  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return null;

  const payload = `${version}.${userId}.${expRaw}`;
  const expected = signPayload(payload);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  return { userId, exp };
}

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

/** Pending cookie remains a plain user id (short-lived, httpOnly). */
export function cookieMatchesUser(
  cookieValue: string | undefined,
  userId: string,
): boolean {
  return Boolean(cookieValue && cookieValue === userId);
}

/** Verified cookie must be a valid HMAC token for this user. */
export function verifiedTwoFaMatchesUser(
  cookieValue: string | undefined,
  userId: string,
): boolean {
  const parsed = parseTwoFaVerifiedToken(cookieValue);
  if (parsed) return parsed.userId === userId;
  // Legacy plain user-id cookies are rejected (force re-challenge once after deploy).
  return false;
}
