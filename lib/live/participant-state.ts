/**
 * Pure participant list helpers for Live Studio realtime sync.
 * Deduplicate by stable user_id (never display name).
 */

export type ParticipantLike = {
  id?: string;
  user_id: string;
  status: string;
  role?: string;
  mic_on?: boolean;
  cam_on?: boolean;
  hand_raised?: boolean;
  sharing?: boolean;
  display_name?: string | null;
  avatar_url?: string | null;
  username?: string | null;
  updated_at?: string;
  joined_at?: string;
  left_at?: string | null;
  [key: string]: unknown;
};

const ACTIVE_STATUSES = new Set(["joined", "requested", "invited"]);
const LEFT_STATUSES = new Set(["left", "removed"]);

export function isActiveParticipantStatus(status: string): boolean {
  return ACTIVE_STATUSES.has(status);
}

export function isLeftParticipantStatus(status: string): boolean {
  return LEFT_STATUSES.has(status);
}

/** Prefer existing profile fields when an incoming realtime row omits them. */
export function mergeParticipantProfile<T extends ParticipantLike>(
  existing: T | undefined,
  incoming: T
): T {
  if (!existing) return incoming;
  return {
    ...existing,
    ...incoming,
    display_name:
      incoming.display_name ?? existing.display_name ?? null,
    avatar_url: incoming.avatar_url ?? existing.avatar_url ?? null,
    username: incoming.username ?? existing.username ?? null,
  };
}

/** True when a realtime row still needs profile hydration. */
export function participantNeedsProfile(row: ParticipantLike | null | undefined): boolean {
  if (!row?.user_id) return false;
  return !row.display_name || !row.avatar_url || !row.username;
}

/**
 * Apply a realtime participant event onto the local list.
 * Dedupes by user_id; removes left/removed; preserves profile fields.
 */
export function applyParticipantEvent<T extends ParticipantLike>(
  prev: T[],
  event: {
    eventType?: string;
    row?: T | null;
    old?: T | null;
  }
): T[] {
  const { eventType, row, old } = event;

  if (eventType === "DELETE") {
    const uid = old?.user_id ?? row?.user_id;
    if (!uid) return prev;
    return prev.filter((p) => p.user_id !== uid);
  }

  if (!row?.user_id) return prev;

  if (isLeftParticipantStatus(row.status)) {
    return prev.filter((p) => p.user_id !== row.user_id);
  }

  const idx = prev.findIndex((p) => p.user_id === row.user_id);
  if (idx >= 0) {
    const next = prev.slice();
    next[idx] = mergeParticipantProfile(prev[idx], row);
    return next;
  }

  if (isActiveParticipantStatus(row.status)) {
    return [...prev, row];
  }

  return prev;
}

/** Keep optimistic joins briefly when a debounced GET races ahead of commit. */
export const RECONCILE_JOIN_GRACE_MS = 5_000;

/**
 * Reconcile authoritative server participants with local optimistic state.
 * Server wins on identity; local profile fields fill gaps when server omits them.
 * Dedupes by user_id.
 *
 * Recent local joins missing from `server` are retained for a short grace window
 * so a stale GET cannot erase a realtime INSERT that just landed.
 */
export function reconcileParticipants<T extends ParticipantLike>(
  local: T[],
  server: T[],
  now = Date.now()
): T[] {
  const localByUser = new Map(local.map((p) => [p.user_id, p]));
  const seen = new Set<string>();
  const out: T[] = [];

  for (const row of server) {
    if (!row.user_id || seen.has(row.user_id)) continue;
    if (!isActiveParticipantStatus(row.status)) continue;
    seen.add(row.user_id);
    out.push(mergeParticipantProfile(localByUser.get(row.user_id), row));
  }

  for (const row of local) {
    if (!row.user_id || seen.has(row.user_id)) continue;
    if (!isActiveParticipantStatus(row.status)) continue;
    const ts = Date.parse(String(row.updated_at ?? row.joined_at ?? ""));
    if (!Number.isFinite(ts) || now - ts >= RECONCILE_JOIN_GRACE_MS) continue;
    seen.add(row.user_id);
    out.push(row);
  }

  return out;
}

export function dedupeParticipantsByUserId<T extends ParticipantLike>(
  list: T[]
): T[] {
  const map = new Map<string, T>();
  for (const p of list) {
    if (!p.user_id) continue;
    const prev = map.get(p.user_id);
    if (!prev) {
      map.set(p.user_id, p);
      continue;
    }
    const prevTs = Date.parse(String(prev.updated_at ?? prev.joined_at ?? 0));
    const nextTs = Date.parse(String(p.updated_at ?? p.joined_at ?? 0));
    map.set(
      p.user_id,
      Number.isFinite(nextTs) && nextTs >= (Number.isFinite(prevTs) ? prevTs : 0)
        ? mergeParticipantProfile(prev, p)
        : mergeParticipantProfile(p, prev)
    );
  }
  return Array.from(map.values());
}
