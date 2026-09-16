/**
 * Join / leave system events for Live Studio chat timeline.
 * Deduplicate by stable event id — never by display name alone.
 */

export type PresenceEventKind = "join" | "leave";

export type PresenceParticipantSnap = {
  user_id: string;
  status: string;
  display_name?: string | null;
  joined_at?: string | null;
  left_at?: string | null;
  updated_at?: string | null;
};

export type PresenceSystemEvent = {
  /** Stable dedupe key */
  id: string;
  kind: PresenceEventKind;
  user_id: string;
  display_name: string;
  body: string;
  created_at: string;
};

const JOINED = "joined";
const LEFT = new Set(["left", "removed"]);

export function safeDisplayName(
  name: string | null | undefined,
  fallback = "Someone"
): string {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return fallback;
  // Never surface raw UUIDs in system notices
  if (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      trimmed
    )
  ) {
    return fallback;
  }
  return trimmed;
}

export function presenceEventId(
  kind: PresenceEventKind,
  sessionId: string,
  userId: string,
  marker: string
): string {
  return `sys:${kind}:${sessionId}:${userId}:${marker}`;
}

export function formatPresenceBody(
  kind: PresenceEventKind,
  displayName: string
): string {
  const name = safeDisplayName(displayName);
  return kind === "join" ? `${name} joined the live` : `${name} left the live`;
}

export function buildPresenceEvent(input: {
  kind: PresenceEventKind;
  sessionId: string;
  userId: string;
  displayName: string | null | undefined;
  marker: string;
  createdAt?: string;
}): PresenceSystemEvent {
  const display_name = safeDisplayName(input.displayName);
  const created_at = input.createdAt ?? new Date().toISOString();
  return {
    id: presenceEventId(input.kind, input.sessionId, input.userId, input.marker),
    kind: input.kind,
    user_id: input.userId,
    display_name,
    body: formatPresenceBody(input.kind, display_name),
    created_at,
  };
}

/**
 * Diff previous vs next active (joined) participant sets.
 * Emits join when a user newly appears as joined; leave when they disappear
 * or transition to left/removed. Skips `selfUserId` to avoid self-noise.
 * Does not treat reconnect refreshes as leave+join when the user stays joined.
 */
export function diffPresenceEvents(opts: {
  sessionId: string;
  prev: PresenceParticipantSnap[];
  next: PresenceParticipantSnap[];
  selfUserId?: string | null;
  seenIds: Set<string>;
}): PresenceSystemEvent[] {
  const { sessionId, prev, next, selfUserId, seenIds } = opts;
  if (!sessionId) return [];

  const prevJoined = new Map(
    prev
      .filter((p) => p.status === JOINED && p.user_id)
      .map((p) => [p.user_id, p])
  );
  const nextJoined = new Map(
    next
      .filter((p) => p.status === JOINED && p.user_id)
      .map((p) => [p.user_id, p])
  );
  const nextByUser = new Map(next.filter((p) => p.user_id).map((p) => [p.user_id, p]));

  const out: PresenceSystemEvent[] = [];

  for (const [uid, row] of nextJoined) {
    if (selfUserId && uid === selfUserId) continue;
    if (prevJoined.has(uid)) continue;
    const marker = row.joined_at || row.updated_at || "join";
    const event = buildPresenceEvent({
      kind: "join",
      sessionId,
      userId: uid,
      displayName: row.display_name,
      marker,
      createdAt: row.joined_at || row.updated_at || undefined,
    });
    if (seenIds.has(event.id)) continue;
    seenIds.add(event.id);
    out.push(event);
  }

  for (const [uid, row] of prevJoined) {
    if (selfUserId && uid === selfUserId) continue;
    if (nextJoined.has(uid)) continue;
    const after = nextByUser.get(uid);
    // Still in list but left/removed — use that marker; otherwise "gone"
    const leftStatus = after && LEFT.has(after.status);
    if (after && !leftStatus && after.status !== JOINED) {
      // invited/requested after being joined is unusual; treat as leave
    }
    const marker =
      after?.left_at ||
      after?.updated_at ||
      row.updated_at ||
      row.joined_at ||
      "leave";
    const event = buildPresenceEvent({
      kind: "leave",
      sessionId,
      userId: uid,
      displayName: after?.display_name ?? row.display_name,
      marker,
      createdAt: after?.left_at || after?.updated_at || undefined,
    });
    if (seenIds.has(event.id)) continue;
    seenIds.add(event.id);
    out.push(event);
  }

  return out;
}

export function markSeenPresenceId(seenIds: Set<string>, id: string, max = 400): void {
  seenIds.add(id);
  if (seenIds.size > max) {
    const trimmed = Array.from(seenIds).slice(-Math.floor(max / 3));
    seenIds.clear();
    for (const x of trimmed) seenIds.add(x);
  }
}

/** Convert presence events into chat-compatible system rows. */
export function presenceToChatMessages(
  events: PresenceSystemEvent[]
): Array<{
  id: string;
  body: string;
  created_at: string;
  sender_name: string;
  sender_avatar: string | null;
  reaction_count: number;
  kind: "system";
}> {
  return events.map((e) => ({
    id: e.id,
    body: e.body,
    created_at: e.created_at,
    sender_name: e.display_name,
    sender_avatar: null,
    reaction_count: 0,
    kind: "system" as const,
  }));
}
