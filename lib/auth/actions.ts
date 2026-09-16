
"use server"

import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { resolvePostLoginPath, DEFAULT_POST_LOGIN_PATH } from "@/lib/auth/post-login-redirect"
import { getPublicAppUrl } from "@/lib/app-url"
import { verifyTOTP } from "@/lib/totp"
import { extractSessionMeta, syncUserSession } from "@/lib/auth/user-sessions"
import {
  canSignInDuringMaintenance,
  MAINTENANCE_LOGIN_ERROR,
} from "@/lib/platform-maintenance"
import { isAccountAccessBlocked } from "@/lib/users/account-status"
import { rethrowIfNextNavigation } from "@/lib/auth/redirect-error"
import {
  hasActiveTwoFactorSecret,
  repairBrokenTwoFactorState,
} from "@/lib/auth/repair-broken-2fa"
import {
  GENERIC_CONFIRMATION_SENT,
  GENERIC_RESET_SENT,
  isExistingAccountAuthError,
  isRateLimitAuthError,
  isUnconfirmedDuplicateSignUp,
  isValidAuthEmail,
  mapIdentityLinkError,
  mapPasswordUpdateError,
  mapSignInAuthError,
  mapSignUpAuthError,
  normalizeSignInEmail,
  oauthOnlySignInMessage,
} from "@/lib/auth/sign-in-errors"
import {
  authProvidersForEmail,
  ensureUserProfile,
} from "@/lib/auth/ensure-user-profile"
import { buildAuthCallbackUrl } from "@/lib/auth/callback-origin"
import { validateNewPassword } from "@/lib/auth/password-rules"
import {
  PASSWORD_RECOVERY_COOKIE,
  accessTokenHasRecoveryAmr,
  claimsIndicatePasswordRecovery,
  passwordRecoveryCookieOptions,
  sanitizeAuthenticatedNext,
} from "@/lib/auth/recovery-session"
import {
  TWO_FA_PENDING_COOKIE,
  TWO_FA_VERIFIED_COOKIE,
  cookieMatchesUser,
  createTwoFaVerifiedToken,
  twoFaPendingCookieOptions,
  twoFaVerifiedCookieOptions,
} from "@/lib/auth/two-fa-session"
import type { UserIdentity } from "@supabase/supabase-js"

function captchaTokenFromForm(formData: FormData): string | undefined {
  const token = String(formData.get("captchaToken") ?? "").trim()
  return token || undefined
}

function setTwoFaVerifiedCookie(
  cookieStore: Awaited<ReturnType<typeof cookies>>,
  userId: string,
) {
  cookieStore.set(
    TWO_FA_VERIFIED_COOKIE,
    createTwoFaVerifiedToken(userId),
    twoFaVerifiedCookieOptions(),
  )
}

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const MAX_2FA_ATTEMPTS = 5
const LOCKOUT_DURATION_MS = 15 * 60 * 1000 // 15 minutes

// ─────────────────────────────────────────────
// Rate limiting
// NOTE: This is in-memory and will reset on server restart.
// Replace with a Redis-backed store (e.g. Upstash) for multi-instance
// production deployments.
// ─────────────────────────────────────────────

interface FailedAttemptEntry {
  count: number
  lockedUntil?: number
}

const failedAttempts = new Map<string, FailedAttemptEntry>()

function checkLocked(userId: string): { locked: boolean; secondsRemaining: number } {
  const entry = failedAttempts.get(userId)
  if (!entry?.lockedUntil) return { locked: false, secondsRemaining: 0 }

  const ms = entry.lockedUntil - Date.now()
  if (ms <= 0) {
    failedAttempts.delete(userId)
    return { locked: false, secondsRemaining: 0 }
  }
  return { locked: true, secondsRemaining: Math.ceil(ms / 1000) }
}

function recordFailedAttempt(userId: string): { locked: boolean; remaining: number } {
  const now = Date.now()
  const entry = failedAttempts.get(userId) ?? { count: 0 }

  if (entry.lockedUntil && entry.lockedUntil > now) {
    return { locked: true, remaining: 0 }
  }

  entry.count += 1
  if (entry.count >= MAX_2FA_ATTEMPTS) {
    entry.lockedUntil = now + LOCKOUT_DURATION_MS
    failedAttempts.set(userId, entry)
    return { locked: true, remaining: 0 }
  }

  failedAttempts.set(userId, entry)
  return { locked: false, remaining: MAX_2FA_ATTEMPTS - entry.count }
}

function clearFailedAttempts(userId: string) {
  failedAttempts.delete(userId)
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

async function resolveLandingPath(userId: string, next?: string | null): Promise<string> {
  // Pass through null/undefined so resolvePostLoginPath treats missing next as
  // "use role default" — do NOT pass DEFAULT as an explicit next (that skips onboarding).
  return resolvePostLoginPath(userId, sanitizeAuthenticatedNext(next))
}

async function currentSessionIsPasswordRecovery(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<boolean> {
  const { data: claimsWrap, error } = await supabase.auth.getClaims()
  if (!error && claimsWrap?.claims) {
    const sub = typeof claimsWrap.claims.sub === "string" ? claimsWrap.claims.sub : ""
    if (sub && sub !== userId) return false
    return claimsIndicatePasswordRecovery(claimsWrap.claims)
  }
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token || session.user.id !== userId) return false
  return accessTokenHasRecoveryAmr(session.access_token)
}

async function registerLoginSession(userId: string) {
  try {
    await syncUserSession(userId, extractSessionMeta(await headers()), { reactivate: true })
  } catch (err) {
    console.error("[auth] registerLoginSession failed:", err)
  }
}

function providersFromUser(user: {
  identities?: { provider?: string }[] | null
  app_metadata?: { providers?: string[]; provider?: string } | null
}): string[] {
  const fromIdentities = (user.identities ?? [])
    .map((identity) => identity.provider)
    .filter((provider): provider is string => Boolean(provider))
  if (fromIdentities.length > 0) return Array.from(new Set(fromIdentities))
  const meta = user.app_metadata?.providers
  if (Array.isArray(meta) && meta.length > 0) return meta.filter(Boolean)
  if (user.app_metadata?.provider) return [user.app_metadata.provider]
  return []
}

export type AuthMethods = {
  email: string | null
  pendingEmail: string | null
  providers: string[]
  hasPassword: boolean
  googleConnected: boolean
}

export async function getAuthMethods(): Promise<AuthMethods | null> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data } = await supabase.auth.getUserIdentities()
    const providers = (data?.identities ?? user.identities ?? []).map((i) => i.provider)
    const unique = Array.from(new Set(providers.filter(Boolean)))
    return {
      email: user.email ?? null,
      pendingEmail: (user as { new_email?: string | null }).new_email ?? null,
      providers: unique.length > 0 ? unique : providersFromUser(user),
      hasPassword: unique.includes("email") || providersFromUser(user).includes("email"),
      googleConnected: unique.includes("google") || providersFromUser(user).includes("google"),
    }
  } catch (err) {
    console.error("[auth] getAuthMethods error:", err)
    return null
  }
}

// ─────────────────────────────────────────────
// Sign up
// ─────────────────────────────────────────────

export async function signUp(formData: FormData) {
  try {
    const supabase = await createClient()

    const email = normalizeSignInEmail((formData.get("email") as string) || "")
    const password = formData.get("password") as string
    const fullName = (formData.get("full_name") as string)?.trim()

    if (!email || !password) return { error: "Email and password are required." }
    if (!isValidAuthEmail(email)) return { error: "Enter a valid email address." }
    const passwordError = validateNewPassword(password, email)
    if (passwordError) return { error: passwordError }

    const next = (formData.get("next") as string)?.trim()
    const callbackUrl = buildAuthCallbackUrl(await getPublicAppUrl(), next || "/verify")
    const captchaToken = captchaTokenFromForm(formData)

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: callbackUrl,
        ...(captchaToken ? { captchaToken } : {}),
      },
    })

    if (error) {
      if (isExistingAccountAuthError(error)) {
        return { error: mapSignUpAuthError(error) }
      }
      return { error: mapSignUpAuthError(error) }
    }

    if (isUnconfirmedDuplicateSignUp(data.user)) {
      return { success: "Check your email to confirm your account." }
    }

    if (data.user) {
      const recovered = await ensureUserProfile(data.user.id, email, fullName)
      if (!recovered) {
        return {
          error:
            "Account was created but profile setup failed. Please try signing in.",
        }
      }
    }

    if (data.session && data.user) {
      await registerLoginSession(data.user.id)
      const path = await resolveLandingPath(data.user.id, next)
      redirect(path)
    }

    return { success: "Check your email to confirm your account." }
  } catch (err) {
    rethrowIfNextNavigation(err)
    console.error("[auth] signUp error:", err)
    return { error: "Temporary server error. Please try again." }
  }
}

export async function resendSignUpConfirmation(formData: FormData) {
  try {
    const email = normalizeSignInEmail((formData.get("email") as string) || "")
    if (!isValidAuthEmail(email)) return { error: "Enter a valid email address." }

    const supabase = await createClient()
    const callbackUrl = buildAuthCallbackUrl(await getPublicAppUrl(), "/verify")
    const captchaToken = captchaTokenFromForm(formData)
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: callbackUrl,
        ...(captchaToken ? { captchaToken } : {}),
      },
    })
    if (error && isRateLimitAuthError(error)) {
      return { error: "Too many attempts. Please wait a moment and try again." }
    }
    return { success: GENERIC_CONFIRMATION_SENT }
  } catch (err) {
    console.error("[auth] resendSignUpConfirmation error:", err)
    return { success: GENERIC_CONFIRMATION_SENT }
  }
}

// ─────────────────────────────────────────────
// Sign in (password)
// ─────────────────────────────────────────────

async function messageForFailedPasswordSignIn(email: string, error: { message?: string | null; code?: string | null; status?: number | null }): Promise<string> {
  const mapped = mapSignInAuthError(error)
  const isInvalid =
    String(error.code ?? "").toLowerCase() === "invalid_credentials" ||
    String(error.message ?? "").toLowerCase().includes("invalid login credentials")
  if (!isInvalid) return mapped

  const identity = await authProvidersForEmail(email)
  if (!identity) return mapped
  if (identity.providers.includes("email")) return mapped
  const oauth = identity.providers.find((provider) => provider !== "email")
  if (oauth) return oauthOnlySignInMessage(oauth)
  return mapped
}

export async function signIn(formData: FormData) {
  const email = normalizeSignInEmail((formData.get("email") as string) || "")
  const password = formData.get("password") as string
  const next = (formData.get("next") as string | null)?.trim() || null

  if (!email || !password) return { error: "Email and password are required." }
  if (!isValidAuthEmail(email)) return { error: "Invalid email or password." }

  let userId: string

  try {
    const supabase = await createClient()
    const captchaToken = captchaTokenFromForm(formData)

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: captchaToken ? { captchaToken } : undefined,
    })
    if (error) {
      // Secure diagnostics only: never log email/password/tokens.
      console.error("[auth] signInWithPassword failed", {
        code: error.code ?? null,
        status: error.status ?? null,
        hasCaptchaToken: Boolean(captchaToken),
        messageClass: /captcha|turnstile/i.test(error.message ?? "")
          ? "captcha"
          : /invalid login credentials/i.test(error.message ?? "")
            ? "invalid_credentials"
            : "other",
      })
      return { error: await messageForFailedPasswordSignIn(email, error) }
    }
    if (!data.user) return { error: "Sign in failed. Please try again." }

    userId = data.user.id
    const cookieStore = await cookies()
    cookieStore.delete(PASSWORD_RECOVERY_COOKIE)
    await ensureUserProfile(userId, email)

    const meta = (data.user.user_metadata ?? {}) as Record<string, unknown>;
    const accountStatus = meta.account_status as string | undefined;
    const { data: profileGate } = await supabase
      .from("profiles")
      .select("is_active, email")
      .eq("id", userId)
      .maybeSingle();

    if (isAccountAccessBlocked(accountStatus, profileGate?.email ?? email, profileGate?.is_active)) {
      await supabase.auth.signOut();
      return {
        error: accountStatus === "deleted"
          ? "This account has been deleted and can no longer sign in."
          : "This account is suspended and cannot sign in.",
      };
    }

    const allowedDuringMaintenance = await canSignInDuringMaintenance(userId, email)
    if (!allowedDuringMaintenance) {
      await supabase.auth.signOut()
      return { error: MAINTENANCE_LOGIN_ERROR }
    }

    // ── 2FA gate ──
    const [profileResult, secretResult] = await Promise.all([
      supabase
        .from("profiles")
        .select("two_factor_enabled")
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("user_2fa_secrets")
        .select("secret")
        .eq("user_id", userId)
        .maybeSingle(),
    ])

    if (profileResult.error) console.error("[auth] 2FA profile lookup error:", profileResult.error)
    if (secretResult.error) console.error("[auth] 2FA secret lookup error:", secretResult.error)

    const hasActiveSecret = hasActiveTwoFactorSecret(secretResult.data?.secret)
    if (profileResult.data?.two_factor_enabled && !hasActiveSecret) {
      try {
        await repairBrokenTwoFactorState(userId)
      } catch (repairErr) {
        console.error("[auth] broken 2FA repair failed:", repairErr)
      }
    }

    const needs2FA = hasActiveSecret

    if (needs2FA) {
      cookieStore.delete(TWO_FA_VERIFIED_COOKIE)
      cookieStore.set(TWO_FA_PENDING_COOKIE, userId, twoFaPendingCookieOptions())

      const safe = sanitizeAuthenticatedNext(next) ?? DEFAULT_POST_LOGIN_PATH
      redirect(`/login/2fa?next=${encodeURIComponent(safe)}`)
    }
  } catch (err) {
    rethrowIfNextNavigation(err)
    console.error("[auth] signIn error:", err)
    return { error: "Sign in failed. Please try again." }
  }

  await registerLoginSession(userId)
  const path = await resolveLandingPath(userId, next)
  redirect(path)
}

// ─────────────────────────────────────────────
// Verify 2FA at login
// ─────────────────────────────────────────────

export async function verify2FAAndLogin(formData: FormData) {
  const cookieStore = await cookies()
  const pendingUserId = cookieStore.get(TWO_FA_PENDING_COOKIE)?.value

  if (!pendingUserId) {
    redirect("/login?error=session_expired")
  }

  // ── Lockout check ──
  const lock = checkLocked(pendingUserId)
  if (lock.locked) {
    return {
      error: `Too many failed attempts. Try again in ${Math.ceil(lock.secondsRemaining / 60)} minute(s).`,
    }
  }

  const token = (formData.get("token") as string)?.trim()
  if (!token) return { error: "Please enter your verification code." }

  // ── Verify the active session belongs to the pending user ──
  // Prevents cookie-swap attacks where a different session is in place.
  const supabase = await createClient()
  const { data: { user: sessionUser } } = await supabase.auth.getUser()

  if (!sessionUser || sessionUser.id !== pendingUserId) {
    cookieStore.delete(TWO_FA_PENDING_COOKIE)
    redirect("/login?error=session_expired")
  }

  cookieStore.delete(PASSWORD_RECOVERY_COOKIE)

  // ── Fetch secret & backup codes ──
  const admin = createAdminClient()
  const { data: secretData, error: secretError } = await admin
    .from("user_2fa_secrets")
    .select("secret, backup_codes")
    .eq("user_id", pendingUserId)
    .maybeSingle()

  if (secretError) {
    console.error("[auth] 2FA secret lookup error:", secretError)
    return { error: "Failed to verify 2FA." }
  }

  const next = (formData.get("next") as string)?.trim() || undefined

  // ── No secret stored — repair incomplete enrollment or continue without 2FA ──
  if (!secretData?.secret || !hasActiveTwoFactorSecret(secretData.secret)) {
    const { data: profile2fa } = await admin
      .from("profiles")
      .select("two_factor_enabled")
      .eq("id", pendingUserId)
      .maybeSingle()

    if (profile2fa?.two_factor_enabled) {
      try {
        await repairBrokenTwoFactorState(pendingUserId, admin)
      } catch (repairErr) {
        console.error("[auth] broken 2FA repair at verify failed:", repairErr)
        return {
          error: "Two-factor authentication is not fully set up on this account. Contact support.",
        }
      }
    }

    cookieStore.delete(TWO_FA_PENDING_COOKIE)
    setTwoFaVerifiedCookie(cookieStore, pendingUserId)
    const allowed = await canSignInDuringMaintenance(pendingUserId, sessionUser.email)
    if (!allowed) {
      await supabase.auth.signOut()
      return { error: MAINTENANCE_LOGIN_ERROR }
    }
    await registerLoginSession(pendingUserId)
    const path = await resolveLandingPath(pendingUserId, next)
    redirect(path)
  }

  const codes = (secretData.backup_codes ?? []) as string[]
  const normalized = token.toUpperCase().replace(/[^A-Z0-9]/g, "")

  // ── Try backup code (atomic consume) ──
  const codeIdx = codes.findIndex(
    (c) => c.replace(/-/g, "").toUpperCase() === normalized
  )

  if (codeIdx !== -1) {
    const remaining = [...codes]
    remaining.splice(codeIdx, 1)

    // Optimistic-concurrency update: only succeeds if backup_codes still
    // matches what we read, preventing double-spend on parallel submits.
    // NOTE: Verify your Supabase client version handles array equality in
    // .eq() correctly; test this path explicitly in your environment.
    const { error: consumeErr, count } = await admin
      .from("user_2fa_secrets")
      .update(
        { backup_codes: remaining, updated_at: new Date().toISOString() },
        { count: "exact" }
      )
      .eq("user_id", pendingUserId)
      .eq("backup_codes", codes as unknown as string)

    if (consumeErr || !count) {
      recordFailedAttempt(pendingUserId)
      return { error: "Invalid verification code." }
    }

    clearFailedAttempts(pendingUserId)
    cookieStore.delete(TWO_FA_PENDING_COOKIE)
    setTwoFaVerifiedCookie(cookieStore, pendingUserId)
    const allowedBackup = await canSignInDuringMaintenance(pendingUserId, sessionUser.email)
    if (!allowedBackup) {
      await supabase.auth.signOut()
      return { error: MAINTENANCE_LOGIN_ERROR }
    }
    await registerLoginSession(pendingUserId)
    const backupPath = await resolveLandingPath(pendingUserId, next)
    redirect(backupPath)
  }

  // ── TOTP verification ──
  if (!verifyTOTP(secretData.secret, token)) {
    const { locked, remaining } = recordFailedAttempt(pendingUserId)
    if (locked) {
      return { error: "Too many failed attempts. Try again in 15 minutes." }
    }
    return { error: `Invalid code. ${remaining} attempt(s) remaining.` }
  }

  clearFailedAttempts(pendingUserId)
  cookieStore.delete(TWO_FA_PENDING_COOKIE)
  setTwoFaVerifiedCookie(cookieStore, pendingUserId)
  const allowedTotp = await canSignInDuringMaintenance(pendingUserId, sessionUser.email)
  if (!allowedTotp) {
    await supabase.auth.signOut()
    return { error: MAINTENANCE_LOGIN_ERROR }
  }
  await registerLoginSession(pendingUserId)
  const path = await resolveLandingPath(pendingUserId, next)
  redirect(path)
}

// ─────────────────────────────────────────────
// Google OAuth
// ─────────────────────────────────────────────

export async function signInWithGoogle(
  next?: string,
  opts?: { errorReturn?: string },
): Promise<void> {
  let redirectUrl: string
  const safeNext = sanitizeAuthenticatedNext(next)
  const errorReturn = sanitizeAuthenticatedNext(opts?.errorReturn) ?? safeNext

  try {
    const supabase = await createClient()
    const callbackUrl = buildAuthCallbackUrl(
      await getPublicAppUrl(),
      safeNext,
    )

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callbackUrl,
        skipBrowserRedirect: true,
        queryParams: { access_type: "offline", prompt: "select_account" },
      },
    })

    if (error || !data?.url) {
      console.error("[auth] signInWithGoogle:", error?.message ?? "missing oauth url")
      redirectUrl = errorReturn
        ? `${errorReturn}${errorReturn.includes("?") ? "&" : "?"}guest_error=google`
        : "/login?error=google_signin_failed"
    } else {
      redirectUrl = data.url
    }
  } catch (err) {
    console.error("[auth] signInWithGoogle error:", err)
    redirectUrl = errorReturn
      ? `${errorReturn}${errorReturn.includes("?") ? "&" : "?"}guest_error=google`
      : "/login?error=google_signin_failed"
  }

  redirect(redirectUrl)
}

/**
 * Passwordless magic-link for Guest Join Live (and similar gated surfaces).
 * Reuses existing Supabase accounts when the email already exists.
 * Always returns a generic success message to avoid email enumeration.
 */
export async function signInWithMagicLink(formData: FormData): Promise<{
  success?: string
  error?: string
  cooldownSeconds?: number
}> {
  try {
    const email = normalizeSignInEmail((formData.get("email") as string) || "")
    if (!email) return { error: "Email is required." }
    if (!isValidAuthEmail(email)) return { error: "Enter a valid email address." }

    const nextRaw = (formData.get("next") as string) || ""
    const safeNext = sanitizeAuthenticatedNext(nextRaw)

    const hdrs = await headers()
    const ip =
      hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      hdrs.get("x-real-ip") ||
      "unknown"

    const { rateLimit } = await import("@/lib/ops/rate-limit")
    const byIp = rateLimit(`magiclink:ip:${ip}`, 8, 15 * 60_000)
    const byEmail = rateLimit(`magiclink:email:${email}`, 4, 15 * 60_000)
    if (!byIp.allowed || !byEmail.allowed) {
      const resetAt = Math.max(byIp.resetAt, byEmail.resetAt)
      const cooldownSeconds = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000))
      return {
        error: "Too many attempts. Please wait a moment and try again.",
        cooldownSeconds,
      }
    }

    const supabase = await createClient()
    const redirectTo = buildAuthCallbackUrl(await getPublicAppUrl(), safeNext)
    const captchaToken = captchaTokenFromForm(formData)

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo,
        shouldCreateUser: true,
        ...(captchaToken ? { captchaToken } : {}),
      },
    })

    if (error && isRateLimitAuthError(error)) {
      return {
        error: "Too many attempts. Please wait a moment and try again.",
        cooldownSeconds: 60,
      }
    }
    if (error) {
      console.error("[auth] signInWithMagicLink:", error.message)
      // Still return generic success to avoid enumeration — except hard config failures
      if (error.message.toLowerCase().includes("signups not allowed")) {
        return { error: "Email sign-in is temporarily unavailable. Try Google instead." }
      }
    }

    return {
      success: "Check your email for a secure link to join this Live.",
      cooldownSeconds: 45,
    }
  } catch (err) {
    console.error("[auth] signInWithMagicLink error:", err)
    return {
      success: "Check your email for a secure link to join this Live.",
      cooldownSeconds: 45,
    }
  }
}

// ─────────────────────────────────────────────
// Sign out
// ─────────────────────────────────────────────

export async function signOut(): Promise<void> {
  try {
    const supabase = await createClient()
    await supabase.auth.signOut({ scope: "local" })

    const cookieStore = await cookies()
    cookieStore.delete(TWO_FA_PENDING_COOKIE)
    cookieStore.delete(TWO_FA_VERIFIED_COOKIE)
    cookieStore.delete(PASSWORD_RECOVERY_COOKIE)
  } catch (err) {
    console.error("[auth] signOut error:", err)
  }
  redirect("/")
}

// ─────────────────────────────────────────────
// Password reset (email link)
// ─────────────────────────────────────────────

export async function resetPassword(formData: FormData) {
  try {
    const email = normalizeSignInEmail((formData.get("email") as string) || "")
    if (!email) return { error: "Email is required." }
    if (!isValidAuthEmail(email)) return { error: "Enter a valid email address." }

    const supabase = await createClient()
    const redirectTo = buildAuthCallbackUrl(await getPublicAppUrl(), "/reset-password")
    const captchaToken = captchaTokenFromForm(formData)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
      ...(captchaToken ? { captchaToken } : {}),
    })
    if (error && isRateLimitAuthError(error)) {
      return { error: "Too many attempts. Please wait a moment and try again." }
    }
    return { success: GENERIC_RESET_SENT }
  } catch (err) {
    console.error("[auth] resetPassword error:", err)
    return { success: GENERIC_RESET_SENT }
  }
}

export async function beginPasswordRecovery(): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ok: false, error: "Reset link expired. Request a new one." }
    if (!(await currentSessionIsPasswordRecovery(supabase, user.id))) {
      return { ok: false, error: "Reset link expired. Request a new one." }
    }
    const cookieStore = await cookies()
    cookieStore.set(PASSWORD_RECOVERY_COOKIE, user.id, passwordRecoveryCookieOptions())
    return { ok: true }
  } catch (err) {
    console.error("[auth] beginPasswordRecovery error:", err)
    return { ok: false, error: "Reset link expired. Request a new one." }
  }
}

export async function hasPasswordRecoverySession(): Promise<boolean> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    const cookieStore = await cookies()
    if (!cookieMatchesUser(cookieStore.get(PASSWORD_RECOVERY_COOKIE)?.value, user.id)) {
      return false
    }
    return currentSessionIsPasswordRecovery(supabase, user.id)
  } catch {
    return false
  }
}

export async function completePasswordReset(formData: FormData) {
  const password = (formData.get("password") as string) || ""
  const confirm = (formData.get("password_confirm") as string) || ""
  if (password !== confirm) return { error: "Passwords do not match." }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Reset link expired. Request a new one." }

  const cookieStore = await cookies()
  const recovery = cookieStore.get(PASSWORD_RECOVERY_COOKIE)?.value
  if (!cookieMatchesUser(recovery, user.id)) {
    return { error: "Reset link expired. Request a new one." }
  }
  if (!(await currentSessionIsPasswordRecovery(supabase, user.id))) {
    cookieStore.delete(PASSWORD_RECOVERY_COOKIE)
    return { error: "Reset link expired. Request a new one." }
  }

  const passwordError = validateNewPassword(password, user.email)
  if (passwordError) return { error: passwordError }

  try {
    const { error } = await supabase.auth.updateUser({ password })
    if (error) return { error: mapPasswordUpdateError(error) }
  } catch (err) {
    console.error("[auth] completePasswordReset error:", err)
    return { error: "Something went wrong. Please try again." }
  }

  cookieStore.delete(PASSWORD_RECOVERY_COOKIE)
  cookieStore.delete(TWO_FA_PENDING_COOKIE)
  try {
    await supabase.auth.signOut({ scope: "local" })
  } catch (err) {
    console.error("[auth] completePasswordReset signOut:", err)
  }
  return { success: "Password updated. Sign in with your new password." }
}

// ─────────────────────────────────────────────
// Update password (from settings)
// Requires current password to prevent stolen-session abuse.
// ─────────────────────────────────────────────

export async function updatePassword(formData: FormData) {
  const supabase = await createClient()
  const currentPassword = formData.get("current_password") as string | null
  const newPassword = formData.get("password") as string

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated." }

  const passwordError = validateNewPassword(newPassword, user.email)
  if (passwordError) return { error: passwordError }

  const methods = providersFromUser(user)
  const hasPassword = methods.includes("email")

  if (hasPassword) {
    if (!currentPassword) return { error: "Current password is required." }
    if (!user.email) return { error: "Account email required to change password." }
    const { error: verifyErr } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    })
    if (verifyErr) return { error: "Current password is incorrect." }
  }

  try {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) return { error: mapPasswordUpdateError(error) }
  } catch (err) {
    console.error("[auth] updatePassword error:", err)
    return { error: "Something went wrong. Please try again." }
  }

  const path = await resolveLandingPath(user.id, "/")
  redirect(path)
}

export async function linkGoogleIdentity(): Promise<void> {
  let redirectUrl = "/identity/security?error=link_failed"
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      redirect("/login?error=session_expired")
    }
    const callbackUrl = buildAuthCallbackUrl(
      await getPublicAppUrl(),
      "/identity/security",
    )
    const { data, error } = await supabase.auth.linkIdentity({
      provider: "google",
      options: {
        redirectTo: callbackUrl,
        skipBrowserRedirect: true,
        queryParams: { access_type: "offline", prompt: "select_account" },
      },
    })
    if (error || !data?.url) {
      console.error("[auth] linkGoogleIdentity:", error?.message ?? "missing url")
      redirectUrl = "/identity/security?error=link_failed"
    } else {
      redirectUrl = data.url
    }
  } catch (err) {
    rethrowIfNextNavigation(err)
    console.error("[auth] linkGoogleIdentity error:", err)
  }
  redirect(redirectUrl)
}

export async function unlinkAuthIdentity(provider: "google" | "email"): Promise<{
  error?: string
  success?: string
}> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: "Not authenticated." }

    const { data, error } = await supabase.auth.getUserIdentities()
    if (error) return { error: mapIdentityLinkError(error) }
    const identities = (data?.identities ?? []) as UserIdentity[]
    if (identities.length < 2) {
      return { error: "Keep at least one sign-in method on your account." }
    }
    const target = identities.find((identity) => identity.provider === provider)
    if (!target) return { error: "That sign-in method is not connected." }
    const { error: unlinkError } = await supabase.auth.unlinkIdentity(target)
    if (unlinkError) return { error: mapIdentityLinkError(unlinkError) }
    return { success: provider === "google" ? "Google disconnected." : "Email login removed." }
  } catch (err) {
    console.error("[auth] unlinkAuthIdentity error:", err)
    return { error: "Could not update connected accounts. Please try again." }
  }
}

// ─────────────────────────────────────────────
// User getters
// ─────────────────────────────────────────────

export async function getUser() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    return user
  } catch {
    return null
  }
}

export async function getProfile() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, email, full_name, avatar_url, two_factor_enabled, user_roles(*), wallets(*)")
      .eq("id", user.id)
      .single()

    return profile
  } catch {
    return null
  }
}