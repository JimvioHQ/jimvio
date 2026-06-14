'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Json } from '@/types/database.types'
import { generateTOTPSecret, verifyTOTP, generateBackupCodes } from '@/lib/totp'
import QRCode from 'qrcode'
import { headers } from 'next/headers'
import {
  extractSessionMeta,
  listUserSessions,
  revokeAllOtherUserSessions,
  revokeUserSession,
  syncUserSession,
  type Session,
} from '@/lib/auth/user-sessions'

export type { Session } from '@/lib/auth/user-sessions'

export type TwoFASetupData = {
  secret: string
  account: string
  issuer: string
  otpauthUri: string
  qrCodeDataUrl: string
  backupCodes: string[]
}

export type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string }

// ─────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────

 const ISSUER = process.env.NEXT_PUBLIC_APP_NAME ?? 'Jimvio'

// ─────────────────────────────────────────────
// Auth helper
// ─────────────────────────────────────────────

async function getAuthenticatedUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Not authenticated')
  return { user, supabase }
}

// ─────────────────────────────────────────────
// 2FA — Setup
// ─────────────────────────────────────────────

export async function initiate2FASetup(): Promise<TwoFASetupData> {
  const { user, supabase } = await getAuthenticatedUser()

  if (!user.email) {
    throw new Error('Account email required for 2FA setup')
  }

  const { secret, uri } = generateTOTPSecret(user.email, ISSUER)
  const backupCodes = generateBackupCodes(8)

  const qrCodeDataUrl = await QRCode.toDataURL(uri, {
    width: 220,
    margin: 1,
    errorCorrectionLevel: 'M',
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
      },
      { onConflict: 'user_id' }
    )

  if (error) {
    // Fallback if `secret` column is still NOT NULL
    if (error.message.includes('not-null constraint')) {
      const { error: fallbackError } = await supabase
        .from('user_2fa_secrets')
        .upsert(
          {
            user_id: user.id,
            secret: '',
            backup_codes: [],
            pending_secret: secret,
            pending_backup_codes: backupCodes,
            pending_expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        )
      if (fallbackError) throw new Error(`Failed to initiate 2FA setup: ${fallbackError.message}`)
    } else {
      throw new Error(`Failed to initiate 2FA setup: ${error.message}`)
    }
  }

  return {
    secret,
    account: user.email,
    issuer: ISSUER,
    otpauthUri: uri,
    qrCodeDataUrl,
    backupCodes,
  }
}

// ─────────────────────────────────────────────
// 2FA — Verify setup
// ─────────────────────────────────────────────

export async function verify2FASetup(token: string): Promise<ActionResult> {
  const { user, supabase } = await getAuthenticatedUser()

  const { data, error: fetchError } = await supabase
    .from('user_2fa_secrets')
    .select('pending_secret, pending_backup_codes, pending_expires_at')
    .eq('user_id', user.id)
    .single()

  if (fetchError || !data?.pending_secret) {
    return { success: false, error: '2FA setup expired. Please start again.' }
  }

  if (data.pending_expires_at && new Date(data.pending_expires_at) < new Date()) {
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

  const { error: updateError } = await supabase
    .from('user_2fa_secrets')
    .update({
      secret: data.pending_secret,
      backup_codes: data.pending_backup_codes,
      pending_secret: null,
      pending_backup_codes: null,
      pending_expires_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id)

  if (updateError) return { success: false, error: `Failed to activate 2FA: ${updateError.message}` }

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ two_factor_enabled: true, updated_at: new Date().toISOString() })
    .eq('id', user.id)

  if (profileError) {
    await supabase
      .from('user_2fa_secrets')
      .update({ secret: null, backup_codes: null })
      .eq('user_id', user.id)
    return { success: false, error: `Failed to update profile: ${profileError.message}` }
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
    .maybeSingle()

  if (!data?.secret) return { success: false, error: '2FA is not enabled.' }
  if (!verifyTOTP(data.secret, token)) return { success: false, error: 'Invalid verification code.' }

  const { error: deleteError } = await supabase
    .from('user_2fa_secrets')
    .delete()
    .eq('user_id', user.id)

  if (deleteError) return { success: false, error: `Failed to disable 2FA: ${deleteError.message}` }

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ two_factor_enabled: false, updated_at: new Date().toISOString() })
    .eq('id', user.id)

  if (profileError) return { success: false, error: `Failed to update profile: ${profileError.message}` }

  return { success: true }
}

// ─────────────────────────────────────────────
// 2FA — Status
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
    .maybeSingle()

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
    .maybeSingle()

  if (!data?.secret) return { success: false, error: '2FA is not enabled.' }

  const codes = (data.backup_codes ?? []) as string[]
  const normalized = token.toUpperCase().replace(/[^A-Z0-9]/g, '')
  const codeIndex = codes.findIndex(
    c => c.replace(/-/g, '').toUpperCase() === normalized
  )

  if (codeIndex !== -1) {
    const remaining = [...codes]
    remaining.splice(codeIndex, 1)

    const { error, count } = await supabase
      .from('user_2fa_secrets')
      .update(
        { backup_codes: remaining, updated_at: new Date().toISOString() },
        { count: 'exact' }
      )
      .eq('user_id', user.id)
      .eq('backup_codes', codes as unknown as string)

    if (error || !count) return { success: false, error: 'Invalid verification code.' }
    return { success: true }
  }

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
    .maybeSingle()

  if (!data?.secret) return { success: false, error: '2FA is not enabled.' }
  if (!verifyTOTP(data.secret, token)) return { success: false, error: 'Invalid verification code.' }

  const newBackupCodes = generateBackupCodes(8)

  const { error } = await supabase
    .from('user_2fa_secrets')
    .update({ backup_codes: newBackupCodes, updated_at: new Date().toISOString() })
    .eq('user_id', user.id)

  if (error) return { success: false, error: `Failed to regenerate codes: ${error.message}` }
  return { success: true, data: { backupCodes: newBackupCodes } }
}

// ─────────────────────────────────────────────
// Sessions
// ─────────────────────────────────────────────

async function sessionMeta() {
  return extractSessionMeta(await headers())
}

/** Register or refresh the current browser session (call after login or on security page). */
export async function syncCurrentSession(): Promise<Session | null> {
  const { user } = await getAuthenticatedUser()
  return syncUserSession(user.id, await sessionMeta())
}

export async function getSessions(): Promise<Session[]> {
  const { user } = await getAuthenticatedUser()
  const meta = await sessionMeta()
  const synced = await syncUserSession(user.id, meta)
  if (!synced) return []
  return listUserSessions(user.id)
}

export async function revokeSession(sessionId: string): Promise<ActionResult> {
  const { user } = await getAuthenticatedUser()
  const result = await revokeUserSession(user.id, sessionId, await sessionMeta())
  if (!result.ok) return { success: false, error: result.error }
  return { success: true }
}

export async function revokeAllOtherSessions(): Promise<ActionResult<{ revokedCount: number }>> {
  const { user, supabase } = await getAuthenticatedUser()
  const result = await revokeAllOtherUserSessions(user.id, await sessionMeta(), supabase)
  if (!result.ok) return { success: false, error: result.error }
  return { success: true, data: { revokedCount: result.revokedCount } }
}

// ─────────────────────────────────────────────
// Password
// ─────────────────────────────────────────────

export async function changePassword(input: {
  currentPassword: string
  newPassword: string
}): Promise<ActionResult> {
  const { user, supabase } = await getAuthenticatedUser()

  if (!input.currentPassword?.trim()) {
    return { success: false, error: 'Current password is required.' }
  }
  if (!input.newPassword || input.newPassword.length < 8) {
    return { success: false, error: 'New password must be at least 8 characters.' }
  }
  if (!user.email) {
    return { success: false, error: 'Account email required to change password.' }
  }

  const { error: verifyErr } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: input.currentPassword,
  })
  if (verifyErr) {
    return { success: false, error: 'Current password is incorrect.' }
  }

  const { error } = await supabase.auth.updateUser({ password: input.newPassword })
  if (error) return { success: false, error: error.message }

  return { success: true }
}

// ─────────────────────────────────────────────
// Platform settings
// ─────────────────────────────────────────────

export async function getPlatformSettings(): Promise<Record<string, unknown>> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('platform_settings').select('key, value')
  if (error || !data) return {}
  return data.reduce(
    (acc, row) => { acc[row.key] = row.value; return acc },
    {} as Record<string, unknown>
  )
}

export async function updatePlatformSetting(
  key: string,
  value: Json | undefined
): Promise<ActionResult> {
  const { user } = await getAuthenticatedUser()

  const adminEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',').map(e => e.trim()).filter(Boolean)

  if (adminEmails.length === 0) {
    return { success: false, error: 'Server misconfiguration: ADMIN_EMAILS not set.' }
  }
  if (!adminEmails.includes(user.email ?? '')) {
    return { success: false, error: 'Unauthorized.' }
  }

  const supabase = createAdminClient()
  const { error } = await supabase.from('platform_settings').upsert(
    { key, value, updated_at: new Date().toISOString() },
    { onConflict: 'key' }
  )

  if (error) return { success: false, error: error.message }
  return { success: true }
}

/**
 * Save multiple settings at once. Used by tabbed forms.
 * Returns per-key success so partial failures are visible.
 */
export async function updatePlatformSettings(
  entries: Record<string, Json>
): Promise<ActionResult<{ saved: string[]; failed: { key: string; error: string }[] }>> {
  const { user } = await getAuthenticatedUser()

  const adminEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',').map(e => e.trim()).filter(Boolean)

  if (adminEmails.length === 0) {
    return { success: false, error: 'Server misconfiguration: ADMIN_EMAILS not set.' }
  }
  if (!adminEmails.includes(user.email ?? '')) {
    return { success: false, error: 'Unauthorized.' }
  }

  const supabase = createAdminClient()
  const saved: string[] = []
  const failed: { key: string; error: string }[] = []

  for (const [key, value] of Object.entries(entries)) {
    const { error } = await supabase.from('platform_settings').upsert(
      { key, value, updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    )
    if (error) failed.push({ key, error: error.message })
    else saved.push(key)
  }

  return { success: true, data: { saved, failed } }
}