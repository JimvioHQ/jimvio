/**
 * Online presence is connection state. Live hosting is a separate session row.
 * One user stays online while any tab still has a presence entry.
 */

export type PresenceState = Record<string, Array<Record<string, unknown>>>;

export function onlineUserIds(state: PresenceState | null | undefined): string[] {
  if (!state) return [];
  return Object.keys(state).filter((id) => id && (state[id]?.length ?? 0) > 0);
}

export function isUserOnline(state: PresenceState | null | undefined, userId: string | null | undefined): boolean {
  if (!userId) return false;
  return onlineUserIds(state).includes(userId);
}

/** Drop presence entries older than the heartbeat window (crashed tab / lost socket). */
export function pruneStalePresence(
  state: PresenceState | null | undefined,
  now: number,
  maxAgeMs: number,
): PresenceState {
  const next: PresenceState = {};
  if (!state) return next;
  for (const [userId, metas] of Object.entries(state)) {
    const fresh = (metas ?? []).filter((meta) => {
      const at = Date.parse(String(meta.online_at ?? ""));
      if (!Number.isFinite(at)) return true;
      return now - at <= maxAgeMs;
    });
    if (fresh.length) next[userId] = fresh;
  }
  return next;
}

export type LiveHost = { userId: string; sessionId: string };

export function liveSessionForUser(hosts: LiveHost[], userId: string | null | undefined): string | null {
  if (!userId) return null;
  return hosts.find((host) => host.userId === userId)?.sessionId ?? null;
}
