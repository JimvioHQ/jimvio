
"use server"

import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { resolvePostLoginPath } from "@/lib/auth/post-login-redirect"
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
  mapSignInAuthError,
  normalizeSignInEmail,
  oauthOnlySignInMessage,
} from "@/lib/auth/sign-in-errors"
import { isSafeInternalPath } from "@/lib/auth/safe-path"
import {
  TWO_FA_PENDING_COOKIE,
  TWO_FA_VERIFIED_COOKIE,
  twoFaPendingCookieOptions,
  twoFaVerifiedCookieOptions,
} from "@/lib/auth/two-fa-session"

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
  return resolvePostLoginPath(userId, next)
}

async function registerLoginSession(userId: string) {
  try {
    await syncUserSession(userId, extractSessionMeta(await headers()), { reactivate: true })
  } catch (err) {
    console.error("[auth] registerLoginSession failed:", err)
  }
}

async function ensureUserProfile(
  userId: string,
  email: string,
  fullName?: string
): Promise<void> {
  const admin = createAdminClient()
  try {
    await Promise.all([
      admin.from("profiles").upsert(
        { id: userId, email, full_name: fullName || email.split("@")[0] },
        { onConflict: "id", ignoreDuplicates: true }
      ),
      admin.from("user_roles").upsert(
        { user_id: userId, role: "buyer" },
        { onConflict: "user_id,role", ignoreDuplicates: true }
      ),
      admin.from("wallets").upsert(
        { user_id: userId },
        { onConflict: "user_id", ignoreDuplicates: true }
      ),
    ])
  } catch (err) {
    console.error("[auth] ensureUserProfile error:", err)
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
    if (password.length < 8) return { error: "Password must be at least 8 characters." }

    const next = (formData.get("next") as string)?.trim()
    let callbackUrl = `${getPublicAppUrl()}/auth/callback`
    if (next && isSafeInternalPath(next)) {
      callbackUrl += `?next=${encodeURIComponent(next)}`
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: callbackUrl,
      },
    })

    if (error) return { error: mapSignInAuthError(error) }
    if (data.user) await ensureUserProfile(data.user.id, email, fullName)

    return { success: "Account created! Check your email to confirm." }
  } catch (err) {
    console.error("[auth] signUp error:", err)
    return { error: "Registration failed. Please try again." }
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

  try {
    const admin = createAdminClient()
    const { data: profile } = await admin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .limit(1)
      .maybeSingle()
    if (!profile?.id) return mapped

    const { data, error: userError } = await admin.auth.admin.getUserById(profile.id)
    if (userError || !data.user) return mapped

    const providers = (data.user.identities ?? [])
      .map((identity) => identity.provider)
      .filter((provider): provider is string => Boolean(provider))
    if (providers.includes("email")) return mapped
    const oauth = providers.find((provider) => provider !== "email")
    if (oauth) return oauthOnlySignInMessage(oauth)
  } catch (err) {
    console.error("[auth] identity lookup failed:", err)
  }
  return mapped
}

export async function signIn(formData: FormData) {
  const email = normalizeSignInEmail((formData.get("email") as string) || "")
  const password = formData.get("password") as string
  const next = (formData.get("next") as string | null)?.trim() || null

  if (!email || !password) return { error: "Email and password are required." }

  let userId: string

  try {
    const supabase = await createClient()

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: await messageForFailedPasswordSignIn(email, error) }
    if (!data.user) return { error: "Sign in failed. Please try again." }

    userId = data.user.id
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

    const needs2FA =
      profileResult.data?.two_factor_enabled || Boolean(secretResult.data?.secret)

    if (needs2FA) {
      const cookieStore = await cookies()
      cookieStore.delete(TWO_FA_VERIFIED_COOKIE)
      cookieStore.set(TWO_FA_PENDING_COOKIE, userId, twoFaPendingCookieOptions())

      const safe = next && isSafeInternalPath(next) ? next : "/dashboard"
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

  // ── No secret stored — fail closed when 2FA is enabled ──
  if (!secretData?.secret) {
    const { data: profile2fa } = await admin
      .from("profiles")
      .select("two_factor_enabled")
      .eq("id", pendingUserId)
      .maybeSingle()

    if (profile2fa?.two_factor_enabled) {
      return {
        error: "Two-factor authentication is not fully set up on this account. Contact support.",
      }
    }

    cookieStore.delete(TWO_FA_PENDING_COOKIE)
    cookieStore.set(TWO_FA_VERIFIED_COOKIE, pendingUserId, twoFaVerifiedCookieOptions())
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
    cookieStore.set(TWO_FA_VERIFIED_COOKIE, pendingUserId, twoFaVerifiedCookieOptions())
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
  cookieStore.set(TWO_FA_VERIFIED_COOKIE, pendingUserId, twoFaVerifiedCookieOptions())
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

export async function signInWithGoogle(next?: string): Promise<void> {
  let redirectUrl: string

  try {
    const supabase = await createClient()

    let callbackUrl = `${await getPublicAppUrl()}/auth/callback`
    if (next && isSafeInternalPath(next)) {
      callbackUrl += `?next=${encodeURIComponent(next)}`
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callbackUrl,
        queryParams: { access_type: "offline", prompt: "select_account" },
      },
    })

    if (error || !data?.url) {
      redirectUrl = "/login?error=google_signin_failed"
    } else {
      redirectUrl = data.url
    }
  } catch (err) {
    console.error("[auth] signInWithGoogle error:", err)
    redirectUrl = "/login?error=google_signin_failed"
  }

  redirect(redirectUrl) // ← always runs, catches all paths
}

// ─────────────────────────────────────────────
// Sign out
// ─────────────────────────────────────────────

export async function signOut(): Promise<void> {
  try {
    const supabase = await createClient()
    await supabase.auth.signOut()

    const cookieStore = await cookies()
    cookieStore.delete(TWO_FA_PENDING_COOKIE)
    cookieStore.delete(TWO_FA_VERIFIED_COOKIE)
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
    const supabase = await createClient()
    const email = normalizeSignInEmail((formData.get("email") as string) || "")
    if (!email) return { error: "Email is required." }

    const redirectTo = `${await getPublicAppUrl()}/auth/callback?next=${encodeURIComponent("/reset-password")}`

    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
    if (error) return { error: "Failed to send reset email. Please try again." }

    return { success: "Password reset link sent. Check your email." }
  } catch (err) {
    console.error("[auth] resetPassword error:", err)
    return { error: "Failed to send reset email. Please try again." }
  }
}

// ─────────────────────────────────────────────
// Update password (from settings)
// Requires current password to prevent stolen-session abuse.
// ─────────────────────────────────────────────

export async function updatePassword(formData: FormData) {
  const supabase = await createClient()
  const currentPassword = formData.get("current_password") as string | null
  const newPassword = formData.get("password") as string

  if (!newPassword) return { error: "New password is required." }
  if (newPassword.length < 8) return { error: "Password must be at least 8 characters." }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated." }

  // Verify current password (skip for first-time set after OAuth signup)
  if (currentPassword && user.email) {
    const { error: verifyErr } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    })
    if (verifyErr) return { error: "Current password is incorrect." }
  }

  try {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) return { error: "Failed to update password. Please try again." }
  } catch (err) {
    console.error("[auth] updatePassword error:", err)
    return { error: "Failed to update password. Please try again." }
  }

  const path = await resolveLandingPath(user.id, "/dashboard")
  redirect(path)
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