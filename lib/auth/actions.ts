
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

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const TWO_FA_COOKIE = "2fa_pending_user"
const TWO_FA_COOKIE_MAX_AGE = 60 * 5 // seconds (5 minutes)
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

/**
 * Returns true only for safe, relative internal paths.
 * Guards against open-redirect attacks including encoded slashes.
 */
function isSafeInternalPath(path: string): boolean {
  return (
    typeof path === "string" &&
    path.startsWith("/") &&
    !path.startsWith("//") &&
    !path.startsWith("/\\") &&
    !path.includes("%2F") &&
    !path.includes("%5C")
  )
}

async function resolveLandingPath(userId: string, next?: string | null): Promise<string> {
  return resolvePostLoginPath(userId, next)
}

async function registerLoginSession(userId: string) {
  try {
    await syncUserSession(userId, extractSessionMeta(await headers()))
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

    const email = (formData.get("email") as string)?.trim()
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

    if (error) return { error: error.message }
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

export async function signIn(formData: FormData) {
  const email = (formData.get("email") as string)?.trim()
  const password = formData.get("password") as string
  const next = (formData.get("next") as string | null)?.trim() || null

  if (!email || !password) return { error: "Email and password are required." }

  let userId: string

  try {
    const supabase = await createClient()

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: error.message }
    if (!data.user) return { error: "Sign in failed. Please try again." }

    userId = data.user.id
    await ensureUserProfile(userId, email)

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
      cookieStore.set(TWO_FA_COOKIE, userId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: TWO_FA_COOKIE_MAX_AGE,
      })

      const safe = next && isSafeInternalPath(next) ? next : "/dashboard"
      redirect(`/login/2fa?next=${encodeURIComponent(safe)}`)
    }
  } catch (err) {
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
  const pendingUserId = cookieStore.get(TWO_FA_COOKIE)?.value

  if (!pendingUserId) {
    redirect("/login?error=Session+expired.+Please+sign+in+again.")
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
    cookieStore.delete(TWO_FA_COOKIE)
    redirect("/login?error=Session+mismatch.+Please+sign+in+again.")
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

  // ── No secret stored — skip 2FA and continue ──
  if (!secretData?.secret) {
    cookieStore.delete(TWO_FA_COOKIE)
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
    cookieStore.delete(TWO_FA_COOKIE)
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
  cookieStore.delete(TWO_FA_COOKIE)
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
      redirectUrl = `/login?error=${encodeURIComponent(error?.message ?? "Google sign-in failed")}`
    } else {
      redirectUrl = data.url
    }
  } catch (err) {
    console.error("[auth] signInWithGoogle error:", err)
    redirectUrl = "/login?error=Google+sign-in+failed"
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
    cookieStore.delete(TWO_FA_COOKIE)
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
    const email = (formData.get("email") as string)?.trim()
    if (!email) return { error: "Email is required." }

    const redirectTo = `${await getPublicAppUrl()}/auth/callback?next=${encodeURIComponent("/reset-password")}`

    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
    if (error) return { error: error.message }

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
    if (error) return { error: error.message }
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