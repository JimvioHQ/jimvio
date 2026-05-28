

"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { resolvePostLoginPath } from "@/lib/auth/post-login-redirect"
import { getPublicAppUrl } from "@/lib/app-url"
import { generateQRCodeFromSecret, generateTOTPCode, verifyTOTP } from "@/lib/totp"
import qrcode from 'qrcode-terminal'
const TWO_FA_COOKIE = "2fa_pending_user"
const TWO_FA_COOKIE_MAX_AGE = 60 * 5 // 5 minutes
const FAILED_2FA_KEY_PREFIX = "2fa_fail:"
const MAX_2FA_ATTEMPTS = 5

async function ensureUserProfile(
  userId: string,
  email: string,
  fullName?: string
) {
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


async function resolveLandingPath(userId: string, next?: string | null): Promise<string> {
  return resolvePostLoginPath(userId, next)
}

function isSafeInternalPath(path: string): boolean {
  return (
    typeof path === "string" &&
    path.startsWith("/") &&
    !path.startsWith("//") &&
    !path.startsWith("/\\")
  )
}

/**
 * Track failed 2FA attempts in-memory per user. Replace with Redis in
 * production if you have multiple instances.
 */
const failedAttempts = new Map<string, { count: number; lockedUntil?: number }>()

function recordFailedAttempt(userId: string): { locked: boolean; remaining: number } {
  const now = Date.now()
  const entry = failedAttempts.get(userId) ?? { count: 0 }

  if (entry.lockedUntil && entry.lockedUntil > now) {
    return { locked: true, remaining: 0 }
  }

  entry.count += 1
  if (entry.count >= MAX_2FA_ATTEMPTS) {
    entry.lockedUntil = now + 15 * 60 * 1000 // 15 min lockout
    failedAttempts.set(userId, entry)
    return { locked: true, remaining: 0 }
  }

  failedAttempts.set(userId, entry)
  return { locked: false, remaining: MAX_2FA_ATTEMPTS - entry.count }
}

function clearFailedAttempts(userId: string) {
  failedAttempts.delete(userId)
}

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

// ─────────────────────────────────────────────
// Sign up
// ─────────────────────────────────────────────

export async function signUp(formData: FormData) {
  try {
    const supabase = await createClient()

    const email = (formData.get("email") as string)?.trim()
    const password = formData.get("password") as string
    const fullName = (formData.get("full_name") as string)?.trim()

    if (!email || !password) {
      return { error: "Email and password are required." }
    }
    if (password.length < 8) {
      return { error: "Password must be at least 8 characters." }
    }

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

    if (data.user) {
      await ensureUserProfile(data.user.id, email, fullName)
    }

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
  let userId: string | undefined

  try {
    const supabase = await createClient()
    const email = (formData.get("email") as string)?.trim()
    const password = formData.get("password") as string

    if (!email || !password) {
      return { error: "Email and password are required." }
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email, password,
    })
    if (error) return { error: error.message }

    userId = data.user?.id
    if (userId && email) {
      await ensureUserProfile(userId, email)
    }
  } catch (err) {
    console.error("[auth] signIn error:", err)
    return { error: "Sign in failed. Please try again." }
  }

  if (!userId) redirect("/dashboard")

  // ── 2FA gate ──
  const supabase = await createClient()
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("two_factor_enabled")
    .eq("id", userId)
    .maybeSingle()

  if (profileError) {
    console.error("[auth] 2FA profile lookup error:", profileError)
  }


  const next = (formData.get("next") as string | null)?.trim() || null;

  const { data: secretData, error: secretError } = await supabase.from("user_2fa_secrets")
    .select("secret,backup_codes")
    .eq("user_id", userId)
    .maybeSingle()

  if (secretError) {
    console.error("[auth] 2FA secret lookup error:", secretError)
  }

  if (profile?.two_factor_enabled || secretData?.secret) {
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

  const path = await resolveLandingPath(userId, next);
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

  // ── Verify the Supabase session belongs to the pending user ──
  // Prevents cookie-swap attacks where one session is in place but the
  // 2FA cookie points to a different user.
  const supabase = await createClient()
  const { data: { user: sessionUser } } = await supabase.auth.getUser()

  if (!sessionUser || sessionUser.id !== pendingUserId) {
    cookieStore.delete(TWO_FA_COOKIE)
    redirect("/login?error=Session+mismatch.+Please+sign+in+again.")
  }

  // ── Fetch secret ──
  const admin = createAdminClient()
  const { data: secretData, error } = await admin
    .from("user_2fa_secrets")
    .select("secret, backup_codes")
    .eq("user_id", pendingUserId)
    .maybeSingle()

  if (error) {
    console.error("[auth] 2FA secret lookup error:", error)
    return { error: "Failed to verify 2FA." }
  }

  const result = await generateQRCodeFromSecret(secretData?.secret || "", sessionUser.email ?? "", "jimvio");

  qrcode.generate(result.otpauth, {
    small: true,
  })
  if (!secretData?.secret) {
    cookieStore.delete(TWO_FA_COOKIE)
    const next = (formData.get("next") as string)?.trim() || undefined
    const path = await resolveLandingPath(pendingUserId, next)
    redirect(path)
  }

  const next = (formData.get("next") as string)?.trim() || undefined
  const codes = (secretData.backup_codes ?? []) as string[]
  const normalized = token.toUpperCase().replace(/[^A-Z0-9]/g, "")

  // ── Try backup code (atomic consume) ──
  const codeIdx = codes.findIndex(
    c => c.replace(/-/g, "").toUpperCase() === normalized
  )

  if (codeIdx !== -1) {
    const remaining = [...codes]
    remaining.splice(codeIdx, 1)

    // Optimistic-concurrency: update succeeds only if `backup_codes` still
    // matches the original array. Prevents double-spend on parallel submits.
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
    const path = await resolveLandingPath(pendingUserId, next)
    redirect(path)
  }

  // ── TOTP fallback ──
  if (!verifyTOTP(secretData.secret, token)) {
    const { locked, remaining } = recordFailedAttempt(pendingUserId)
    if (locked) {
      return { error: "Too many failed attempts. Try again in 15 minutes." }
    }
    return {
      error: `Invalid code. ${remaining} attempt(s) remaining.`,
    }
  }

  clearFailedAttempts(pendingUserId)
  cookieStore.delete(TWO_FA_COOKIE)
  const path = await resolveLandingPath(pendingUserId, next)
  redirect(path)
}

// ─────────────────────────────────────────────
// Google OAuth
// ─────────────────────────────────────────────

export async function signInWithGoogle(
  nextOrFormData?: string | FormData
): Promise<void> {
  let redirectUrl: string | undefined

  try {
    const supabase = await createClient()
    const nextPath =
      typeof nextOrFormData === "string" ? nextOrFormData : undefined

    let callbackUrl = `${getPublicAppUrl()}/auth/callback`
    if (nextPath && isSafeInternalPath(nextPath)) {
      callbackUrl += `?next=${encodeURIComponent(nextPath)}`
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl },
    })

    if (error) {
      redirectUrl = `/login?error=${encodeURIComponent(error.message)}`
      return
    }
    redirectUrl = data.url
  } catch (err) {
    console.error("[auth] signInWithGoogle error:", err)
    redirectUrl = "/login?error=Google+sign-in+failed"
  }

  if (redirectUrl) redirect(redirectUrl)
}

// ─────────────────────────────────────────────
// Sign out
// ─────────────────────────────────────────────

export async function signOut() {
  try {
    const supabase = await createClient()
    await supabase.auth.signOut()

    // Clear any lingering 2FA pending cookie
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

    // Send the user to /auth/callback so Supabase can verify the recovery
    // token, then callback routes them to /reset-password
    const redirectTo =
      `${getPublicAppUrl()}/auth/callback?next=${encodeURIComponent("/reset-password")}`

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    })

    if (error) return { error: error.message }
    return { success: "Password reset link sent. Check your email." }
  } catch (err) {
    console.error("[auth] resetPassword error:", err)
    return { error: "Failed to send reset email. Please try again." }
  }
}

// ─────────────────────────────────────────────
// Update password (from settings)
// Requires current password to prevent stolen-session abuse
// ─────────────────────────────────────────────

export async function updatePassword(formData: FormData) {
  const supabase = await createClient()
  const currentPassword = formData.get("current_password") as string | null
  const password = formData.get("password") as string

  if (!password) return { error: "New password is required." }
  if (password.length < 8) return { error: "Password must be at least 8 characters." }

  // ── Verify current password (skip for first-time set after OAuth signup) ──
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated." }

  if (currentPassword && user.email) {
    const { error: verifyErr } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    })
    if (verifyErr) {
      return { error: "Current password is incorrect." }
    }
  }

  try {
    const { error } = await supabase.auth.updateUser({ password })
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
      .select("*, user_roles(*), wallets(*)")
      .eq("id", user.id)
      .single()

    return profile
  } catch {
    return null
  }
}