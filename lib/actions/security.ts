'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Json } from '@/types/database.types'
import { generateTOTPSecret, verifyTOTP, generateBackupCodes } from '@/lib/totp'
import QRCode from 'qrcode'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type Session = {
  id: string
  device: string
  ip: string
  lastActivity: string
  location: string
  current?: boolean
}

export type TwoFASetupData = {
  secret: string
  qrCodeDataUrl: string
  backupCodes: string[]
}

export type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string }

// ─────────────────────────────────────────────
// Auth helper — returns the current user or throws
// ─────────────────────────────────────────────

async function getAuthenticatedUser() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    throw new Error('Not authenticated')
  }

  return { user, supabase }
}

// ─────────────────────────────────────────────
// 2FA — Setup
// ─────────────────────────────────────────────

export async function initiate2FASetup(): Promise<TwoFASetupData> {
  const { user, supabase } = await getAuthenticatedUser()

  const { secret, uri } = generateTOTPSecret(user.email!, 'YourAppName')
  const backupCodes = generateBackupCodes(8)

  const qrCodeDataUrl = await QRCode.toDataURL(uri, {
    width: 200,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
  })

  // Store as pending — not active until the user verifies with a valid token
  const { error } = await supabase
    .from('user_2fa_secrets')
    .upsert(
      {
        user_id: user.id,
        pending_secret: secret,
        pending_backup_codes: backupCodes,
        pending_expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      } as any,
      { onConflict: 'user_id' }
    )

  if (error) throw new Error(`Failed to initiate 2FA setup: ${error.message}`)

  return { secret, qrCodeDataUrl, backupCodes }
}

// ─────────────────────────────────────────────
// 2FA — Verify setup and activate
// ─────────────────────────────────────────────

export async function verify2FASetup(
  token: string
): Promise<ActionResult> {
  const { user, supabase } = await getAuthenticatedUser()

  const { data, error: fetchError } = await supabase
    .from('user_2fa_secrets')
    .select('pending_secret, pending_backup_codes, pending_expires_at')
    .eq('user_id', user.id)
    .single()

  if (fetchError || !data?.pending_secret) {
    return { success: false, error: '2FA setup expired. Please start again.' }
  }

  if (new Date(data.pending_expires_at!) < new Date()) {
    // Clean up expired pending data
    await supabase
      .from('user_2fa_secrets')
      .update({
        pending_secret: null,
        pending_backup_codes: null,
        pending_expires_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)

    return { success: false, error: '2FA setup expired. Please start again.' }
  }

  if (!verifyTOTP(data.pending_secret, token)) {
    return { success: false, error: 'Invalid verification code. Please try again.' }
  }

  // Promote pending → active
  const [secretResult, profileResult] = await Promise.all([
    supabase.from('user_2fa_secrets').upsert(
      {
        user_id: user.id,
        secret: data.pending_secret,
        backup_codes: data.pending_backup_codes,
        pending_secret: null,
        pending_backup_codes: null,
        pending_expires_at: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    ),
    supabase
      .from('profiles')
      .update({
        two_factor_enabled: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id),
  ])

  if (secretResult.error) {
    return { success: false, error: `Failed to activate 2FA: ${secretResult.error.message}` }
  }
  if (profileResult.error) {
    return { success: false, error: `Failed to update profile: ${profileResult.error.message}` }
  }

  return { success: true }
}

// ─────────────────────────────────────────────
// 2FA — Disable
// ─────────────────────────────────────────────

export async function disable2FA(token: string): Promise<ActionResult> {
  const { user, supabase } = await getAuthenticatedUser()

  const { data } = await supabase
    .from('user_2fa_secrets')
    .select('secret')
    .eq('user_id', user.id)
    .single()

  if (!data?.secret) {
    return { success: false, error: '2FA is not enabled.' }
  }

  if (!verifyTOTP(data.secret, token)) {
    return { success: false, error: 'Invalid verification code.' }
  }

  const [deleteResult, profileResult] = await Promise.all([
    supabase.from('user_2fa_secrets').delete().eq('user_id', user.id),
    supabase
      .from('profiles')
      .update({
        two_factor_enabled: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id),
  ])

  if (deleteResult.error) {
    return { success: false, error: `Failed to disable 2FA: ${deleteResult.error.message}` }
  }
  if (profileResult.error) {
    return { success: false, error: `Failed to update profile: ${profileResult.error.message}` }
  }

  return { success: true }
}

// ─────────────────────────────────────────────
// 2FA — Check status (for settings page)
// ─────────────────────────────────────────────

export async function check2FAStatus(): Promise<{
  enabled: boolean
  backupCodesRemaining?: number
}> {
  const { user, supabase } = await getAuthenticatedUser()

  const { data } = await supabase
    .from('user_2fa_secrets')
    .select('secret, backup_codes')
    .eq('user_id', user.id)
    .single()

  if (!data?.secret) return { enabled: false }

  const codes = (data.backup_codes ?? []) as string[]
  return { enabled: true, backupCodesRemaining: codes.length }
}

// ─────────────────────────────────────────────
// 2FA — Verify at login
// ─────────────────────────────────────────────

export async function verify2FALogin(token: string): Promise<ActionResult> {
  const { user, supabase } = await getAuthenticatedUser()

  const { data } = await supabase
    .from('user_2fa_secrets')
    .select('secret, backup_codes')
    .eq('user_id', user.id)
    .single()

  if (!data?.secret) {
    return { success: false, error: '2FA is not enabled.' }
  }

  // Try backup codes first
  const codes = (data.backup_codes ?? []) as string[]
  const normalized = token.toUpperCase().replace(/[^A-Z0-9]/g, '')
  const codeIndex = codes.findIndex(
    (c) => c.replace(/-/g, '').toUpperCase() === normalized
  )

  if (codeIndex !== -1) {
    // Consume the used backup code
    codes.splice(codeIndex, 1)
    await supabase
      .from('user_2fa_secrets')
      .update({
        backup_codes: codes,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)

    return { success: true }
  }

  // Fall back to TOTP
  if (!verifyTOTP(data.secret, token)) {
    return { success: false, error: 'Invalid verification code.' }
  }

  return { success: true }
}

// ─────────────────────────────────────────────
// 2FA — Regenerate backup codes
// ─────────────────────────────────────────────

export async function regenerateBackupCodes(
  token: string
): Promise<ActionResult<{ backupCodes: string[] }>> {
  const { user, supabase } = await getAuthenticatedUser()

  const { data } = await supabase
    .from('user_2fa_secrets')
    .select('secret')
    .eq('user_id', user.id)
    .single()

  if (!data?.secret) {
    return { success: false, error: '2FA is not enabled.' }
  }

  if (!verifyTOTP(data.secret, token)) {
    return { success: false, error: 'Invalid verification code.' }
  }

  const newBackupCodes = generateBackupCodes(8)

  const { error } = await supabase
    .from('user_2fa_secrets')
    .update({
      backup_codes: newBackupCodes,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id)

  if (error) {
    return { success: false, error: `Failed to regenerate codes: ${error.message}` }
  }

  return { success: true, data: { backupCodes: newBackupCodes } }
}

// ─────────────────────────────────────────────
// Sessions
// Sessions are stored in platform_settings scoped per-user
// using key pattern: `sessions:<user_id>`
// ─────────────────────────────────────────────

function sessionKey(userId: string) {
  return `sessions:${userId}`
}

export async function getSessions(): Promise<Session[]> {
  const { user } = await getAuthenticatedUser()
  // Use admin client since platform_settings has no per-user write policies
  const supabase = createAdminClient()

  const { data } = await supabase
    .from('platform_settings')
    .select('value')
    .eq('key', sessionKey(user.id))
    .single()

  if (!data?.value) {
    return [
      {
        id: '1',
        device: 'Current Browser',
        ip: '127.0.0.1',
        lastActivity: 'Just now',
        location: 'Unknown',
        current: true,
      },
    ]
  }

  return (data.value as { sessions: Session[] }).sessions
}

export async function revokeSession(
  sessionId: string
): Promise<ActionResult> {
  const { user } = await getAuthenticatedUser()
  const supabase = createAdminClient()

  const { data } = await supabase
    .from('platform_settings')
    .select('value')
    .eq('key', sessionKey(user.id))
    .single()

  if (!data?.value) {
    return { success: false, error: 'Session not found.' }
  }

  const sessions: Session[] = (data.value as { sessions: Session[] }).sessions
  const session = sessions.find((s) => s.id === sessionId)

  if (!session) return { success: false, error: 'Session not found.' }
  if (session.current) return { success: false, error: 'Cannot revoke current session.' }

  const updated = sessions.filter((s) => s.id !== sessionId)

  const { error } = await supabase
    .from('platform_settings')
    .upsert(
      {
        key: sessionKey(user.id),
        value: { sessions: updated },
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' }
    )

  if (error) return { success: false, error: error.message }

  return { success: true }
}

export async function revokeAllOtherSessions(): Promise<
  ActionResult<{ revokedCount: number }>
> {
  const { user } = await getAuthenticatedUser()
  const supabase = createAdminClient()

  const { data } = await supabase
    .from('platform_settings')
    .select('value')
    .eq('key', sessionKey(user.id))
    .single()

  if (!data?.value) return { success: true, data: { revokedCount: 0 } }

  const sessions: Session[] = (data.value as { sessions: Session[] }).sessions
  const current = sessions.find((s) => s.current)
  const revokedCount = sessions.length - (current ? 1 : 0)

  const { error } = await supabase
    .from('platform_settings')
    .upsert(
      {
        key: sessionKey(user.id),
        value: { sessions: current ? [current] : [] },
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' }
    )

  if (error) return { success: false, error: error.message }

  return { success: true, data: { revokedCount } }
}

// ─────────────────────────────────────────────
// Platform settings — admin only
// Uses admin client because platform_settings has no
// authenticated write policies (by design — global settings)
// ─────────────────────────────────────────────

export async function getPlatformSettings(): Promise<Record<string, unknown>> {
  // Reading is fine with the regular client (SELECT policy is public)
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('platform_settings')
    .select('key, value')

  if (error || !data) return {}

  return data.reduce(
    (acc, row) => {
      acc[row.key] = row.value
      return acc
    },
    {} as Record<string, unknown>
  )
}

export async function updatePlatformSetting(
  key: string,
  value: Json | undefined
): Promise<ActionResult> {
  // Verify the caller is authenticated before using admin client
  const { user } = await getAuthenticatedUser()

  // Optional: restrict to known admin emails
  const adminEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean)

  if (adminEmails.length > 0 && !adminEmails.includes(user.email ?? '')) {
    return { success: false, error: 'Unauthorized.' }
  }

  // Use admin client since platform_settings has no authenticated write policies
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('platform_settings')
    .upsert(
      {
        key,
        value,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' }
    )

  if (error) return { success: false, error: error.message }

  return { success: true }
}