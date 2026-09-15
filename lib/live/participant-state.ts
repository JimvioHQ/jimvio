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
  updated_at?: string;
  joined_at?: string;
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
  };
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

/**
 * Reconcile authoritative server participants with local optimistic state.
 * Server wins on identity; local profile fields fill gaps when server omits them.
 * Dedupes by user_id.
 */
export function reconcileParticipants<T extends ParticipantLike>(
  local: T[],
  server: T[]
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
