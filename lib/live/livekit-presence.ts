/**
 * LiveKit-authoritative in-room presence helpers.
 * When the SFU is connected, remotes + self are the source of truth for who
 * is visually in the room. DB rows hydrate profiles and cover waiting-room /
 * just-joined users still connecting — never resurrect departed remotes.
 */

export type PresenceRemote = {
  identity: string;
  name?: string | null;
  role?: string | null;
};

export type PresenceDbRow = {
  user_id: string;
  status: string;
  role?: string | null;
  display_name?: string | null;
  joined_at?: string | null;
  updated_at?: string | null;
};

/** Recent DB joins may appear before LiveKit connect completes. */
export const LIVEKIT_JOIN_GRACE_MS = 8_000;

/**
 * Compose in-room identities for People / PIP / count.
 * Connected: self + LiveKit remotes (+ waiting/invited + short join grace).
 * Not connected: self + last known LiveKit identities (if provided) — never
 * expand to the full DB joined list (that resurrects leavers during SFU blips).
 */
export function composeLivePresenceIds(input: {
  selfId?: string | null;
  remotes: PresenceRemote[];
  dbParticipants: PresenceDbRow[];
  connected: boolean;
  /** Snapshot of identities last observed while LiveKit was connected. */
  lastConnectedIds?: Iterable<string> | null;
  now?: number;
}): string[] {
  const {
    selfId = null,
    remotes,
    dbParticipants,
    connected,
    lastConnectedIds = null,
    now = Date.now(),
  } = input;

  const ids = new Set<string>();
  if (selfId) ids.add(selfId);

  if (connected) {
    for (const r of remotes) {
      if (r.identity) ids.add(r.identity);
    }
    for (const p of dbParticipants) {
      if (p.status === "requested" || p.status === "invited") {
        if (p.user_id) ids.add(p.user_id);
      }
    }
    for (const p of dbParticipants) {
      if (p.status !== "joined" || !p.user_id || ids.has(p.user_id)) continue;
      const ts = Date.parse(String(p.joined_at ?? p.updated_at ?? ""));
      if (!Number.isFinite(ts) || now - ts > LIVEKIT_JOIN_GRACE_MS) continue;
      ids.add(p.user_id);
    }
    return Array.from(ids);
  }

  // Disconnected / reconnecting: prefer last LiveKit room snapshot over DB.
  if (lastConnectedIds) {
    for (const id of lastConnectedIds) {
      if (id) ids.add(id);
    }
  }
  for (const p of dbParticipants) {
    if (p.status === "requested" || p.status === "invited") {
      if (p.user_id) ids.add(p.user_id);
    }
  }
  return Array.from(ids);
}

/**
 * In-room participant count for the Live dock / People badge.
 * When LiveKit is connected, count is LiveKit-primary (never lagging DB joined).
 */
export function countLivePresence(input: {
  connected: boolean;
  selfId?: string | null;
  remoteCount: number;
  /** Waiting / invited (not yet in SFU). */
  pendingDbCount?: number;
  /** Fallback when LiveKit is not connected. */
  composedIdCount: number;
}): number {
  const {
    connected,
    selfId = null,
    remoteCount,
    pendingDbCount = 0,
    composedIdCount,
  } = input;
  if (connected) {
    return (selfId ? 1 : 0) + remoteCount + pendingDbCount;
  }
  return composedIdCount;
}

/**
 * Pick the active remote screen-share identity from publication order.
 * Latest published/subscribed screen wins (handoff B → C → B).
 */
export function selectLatestScreenShareIdentity(input: {
  screenIdentities: string[];
  order: Map<string, number> | Record<string, number>;
  fallback?: string | null;
}): string | null {
  const { screenIdentities, order, fallback = null } = input;
  if (!screenIdentities.length) return null;
  const get = (id: string) =>
    order instanceof Map ? order.get(id) ?? 0 : order[id] ?? 0;
  let best: string | null = null;
  let bestTs = -1;
  for (const id of screenIdentities) {
    const ts = get(id);
    if (ts >= bestTs) {
      bestTs = ts;
      best = id;
    }
  }
  if (best && bestTs > 0) return best;
  if (fallback && screenIdentities.includes(fallback)) return fallback;
  return screenIdentities[screenIdentities.length - 1] ?? null;
}
