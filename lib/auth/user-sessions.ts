import { createAdminClient } from '@/lib/supabase/admin'
import type { SupabaseClient } from '@supabase/supabase-js'

export type Session = {
  id: string
  device: string
  ip: string
  lastActivity: string
  location: string
  current?: boolean
}

export type SessionMeta = {
  userAgent: string
  ip: string
  country?: string
}

type SessionStore = {
  sessions: Session[]
  revokedIds: string[]
}

const MAX_SESSIONS = 12

function sessionKey(userId: string) {
  return `sessions:${userId}`
}

export function parseDevice(userAgent: string): string {
  const ua = userAgent || 'Unknown browser'
  if (/Edg\//i.test(ua)) return 'Edge'
  if (/iPhone|iPad/i.test(ua)) return /CriOS/i.test(ua) ? 'Chrome on iOS' : 'Safari on iOS'
  if (/Android/i.test(ua)) return /Chrome/i.test(ua) ? 'Chrome on Android' : 'Android browser'
  if (/Mac OS X/i.test(ua)) return /Chrome/i.test(ua) ? 'Chrome on macOS' : 'Safari on macOS'
  if (/Windows/i.test(ua)) return /Chrome/i.test(ua) ? 'Chrome on Windows' : 'Browser on Windows'
  if (/Firefox/i.test(ua)) return 'Firefox'
  if (/Chrome/i.test(ua)) return 'Chrome'
  return 'Web browser'
}

export async function buildSessionId(
  userId: string,
  userAgent: string,
  ip: string
): Promise<string> {
  const data = new TextEncoder().encode(`${userId}:${userAgent}:${ip}`)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 20)
}

export function extractSessionMeta(headers: Headers): SessionMeta {
  return {
    userAgent: headers.get('user-agent') ?? 'Unknown browser',
    ip:
      headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      headers.get('x-real-ip') ||
      headers.get('cf-connecting-ip') ||
      'Unknown IP',
    country: headers.get('x-vercel-ip-country') ?? undefined,
  }
}

function formatLastActivity(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

function emptyStore(): SessionStore {
  return { sessions: [], revokedIds: [] }
}

function parseStore(value: unknown): SessionStore {
  if (!value || typeof value !== 'object') return emptyStore()
  const raw = value as { sessions?: Session[]; revokedIds?: string[] }
  return {
    sessions: Array.isArray(raw.sessions) ? raw.sessions : [],
    revokedIds: Array.isArray(raw.revokedIds) ? raw.revokedIds : [],
  }
}

async function readSessionStore(userId: string): Promise<SessionStore> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('platform_settings')
    .select('value')
    .eq('key', sessionKey(userId))
    .maybeSingle()

  if (error) {
    console.error('[sessions] read failed:', error.message)
    return emptyStore()
  }

  return parseStore(data?.value)
}

async function writeSessionStore(userId: string, store: SessionStore): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase.from('platform_settings').upsert(
    {
      key: sessionKey(userId),
      value: {
        sessions: store.sessions.slice(0, MAX_SESSIONS),
        revokedIds: store.revokedIds.slice(-50),
      },
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'key' }
  )

  if (error) {
    console.error('[sessions] write failed:', error.message)
    throw new Error(`Failed to save sessions: ${error.message}`)
  }
}

export async function isSessionRevoked(userId: string, meta: SessionMeta): Promise<boolean> {
  const id = await buildSessionId(userId, meta.userAgent, meta.ip)
  const store = await readSessionStore(userId)
  return store.revokedIds.includes(id)
}

/** Register or refresh a device session. Returns null when this device was banned. */
export async function syncUserSession(
  userId: string,
  meta: SessionMeta
): Promise<Session | null> {
  const now = new Date().toISOString()
  const id = await buildSessionId(userId, meta.userAgent, meta.ip)
  const store = await readSessionStore(userId)

  if (store.revokedIds.includes(id)) {
    return null
  }

  const current: Session = {
    id,
    device: parseDevice(meta.userAgent),
    ip: meta.ip,
    lastActivity: now,
    location: meta.country ?? 'Unknown',
    current: true,
  }

  const others = store.sessions
    .filter((s) => s.id !== id && !store.revokedIds.includes(s.id))
    .map((s) => ({ ...s, current: false }))

  await writeSessionStore(userId, {
    revokedIds: store.revokedIds,
    sessions: [{ ...current, lastActivity: now }, ...others].slice(0, MAX_SESSIONS),
  })

  return { ...current, lastActivity: 'Just now' }
}

export async function listUserSessions(
  userId: string,
  meta?: SessionMeta
): Promise<Session[]> {
  if (meta) {
    const synced = await syncUserSession(userId, meta)
    if (!synced) return []
  }

  const store = await readSessionStore(userId)
  return store.sessions
    .filter((s) => !store.revokedIds.includes(s.id))
    .map((s) => ({
      ...s,
      lastActivity: s.current
        ? 'Just now'
        : /^\d{4}-\d{2}-\d{2}/.test(s.lastActivity)
          ? formatLastActivity(s.lastActivity)
          : s.lastActivity,
    }))
}

export async function revokeUserSession(
  userId: string,
  sessionId: string,
  meta: SessionMeta
): Promise<{ ok: true } | { ok: false; error: string }> {
  const currentId = await buildSessionId(userId, meta.userAgent, meta.ip)
  if (sessionId === currentId) {
    return { ok: false, error: 'Cannot sign out your current session here.' }
  }

  const store = await readSessionStore(userId)
  const session = store.sessions.find((s) => s.id === sessionId)
  if (!session) {
    return { ok: false, error: 'Session not found.' }
  }

  const revokedIds = store.revokedIds.includes(sessionId)
    ? store.revokedIds
    : [...store.revokedIds, sessionId]

  await writeSessionStore(userId, {
    revokedIds,
    sessions: store.sessions.filter((s) => s.id !== sessionId),
  })

  return { ok: true }
}

export async function revokeAllOtherUserSessions(
  userId: string,
  meta: SessionMeta,
  supabase: SupabaseClient
): Promise<{ ok: true; revokedCount: number } | { ok: false; error: string }> {
  const currentId = await buildSessionId(userId, meta.userAgent, meta.ip)
  const store = await readSessionStore(userId)
  const otherIds = store.sessions.filter((s) => s.id !== currentId).map((s) => s.id)
  const revokedIds = [...new Set([...store.revokedIds, ...otherIds])]
  const current = store.sessions.find((s) => s.id === currentId)

  const { error } = await supabase.auth.signOut({ scope: 'others' })
  if (error) {
    console.error('[sessions] signOut others failed:', error.message)
  }

  await writeSessionStore(userId, {
    revokedIds,
    sessions: current
      ? [{ ...current, current: true, lastActivity: new Date().toISOString() }]
      : [],
  })

  return { ok: true, revokedCount: otherIds.length }
}
