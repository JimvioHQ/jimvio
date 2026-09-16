/**
 * Pure chat message helpers for Live Studio realtime + optimistic UI.
 * Deduplicate by message id (never by body text alone).
 */

export type ChatMessageLike = {
  id: string;
  body: string;
  created_at: string;
  client_id?: string | null;
  pending?: boolean;
  failed?: boolean;
  sender_name?: string;
  sender_avatar?: string | null;
  [key: string]: unknown;
};

function byCreatedAtAsc(a: ChatMessageLike, b: ChatMessageLike): number {
  const ta = Date.parse(a.created_at);
  const tb = Date.parse(b.created_at);
  if (ta !== tb) return ta - tb;
  return a.id.localeCompare(b.id);
}

export function sortMessagesChronologically<T extends ChatMessageLike>(
  messages: T[]
): T[] {
  return messages.slice().sort(byCreatedAtAsc);
}

/** Upsert by id; optionally replace a temporary client_id row.
 * Guarantees at most one row per server message id (and drops the temp row).
 */
export function upsertChatMessage<T extends ChatMessageLike>(
  prev: T[],
  incoming: T,
  opts?: { replaceClientId?: string | null }
): T[] {
  if (!incoming?.id) return prev;

  const replaceId = opts?.replaceClientId ?? incoming.client_id ?? null;
  const next: T[] = [];
  let merged: T | null = null;

  for (const m of prev) {
    const isServerMatch = m.id === incoming.id;
    const isTempMatch = Boolean(replaceId && m.id === replaceId);
    if (isServerMatch || isTempMatch) {
      merged = {
        ...m,
        ...incoming,
        id: incoming.id,
        pending: false,
        failed: false,
        client_id: replaceId ?? m.client_id ?? incoming.client_id ?? null,
      };
      continue;
    }
    next.push(m);
  }

  next.push(merged ?? { ...incoming, pending: false });
  return sortMessagesChronologically(next);
}

/**
 * Merge a full history fetch with local optimistic/pending rows.
 * Server ids win; pending client rows kept until matched.
 */
export function reconcileChatHistory<T extends ChatMessageLike>(
  local: T[],
  server: T[]
): T[] {
  const byId = new Map<string, T>();
  const pending: T[] = [];

  for (const m of local) {
    if (m.pending || m.failed || String(m.id).startsWith("outbox:") || String(m.id).startsWith("tmp:")) {
      pending.push(m);
    } else {
      byId.set(m.id, m);
    }
  }

  for (const m of server) {
    byId.set(m.id, { ...(byId.get(m.id) ?? ({} as T)), ...m, pending: false, failed: false });
  }

  const serverIds = new Set(server.map((m) => m.id));
  const keptPending = pending.filter((p) => {
    if (serverIds.has(p.id)) return false;
    // Drop pending if a server message matches body+created window via client_id
    if (p.client_id && server.some((s) => s.id === p.client_id || s.client_id === p.client_id)) {
      return false;
    }
    // Drop optimistic rows already confirmed under a different server id
    // (same body within a short window) to avoid refresh races.
    const pendingAt = Date.parse(p.created_at);
    if (
      Number.isFinite(pendingAt) &&
      server.some((s) => {
        if (s.body !== p.body) return false;
        const serverAt = Date.parse(s.created_at);
        return Number.isFinite(serverAt) && Math.abs(serverAt - pendingAt) < 120_000;
      })
    ) {
      return false;
    }
    return true;
  });

  return sortMessagesChronologically([...byId.values(), ...keptPending]);
}

/** True when insert should be ignored because we already have this message. */
export function shouldSkipRealtimeInsert(
  seenIds: Set<string>,
  messageId: string | undefined | null
): boolean {
  if (!messageId) return true;
  if (seenIds.has(messageId)) return true;
  return false;
}

export function markSeenMessageId(seenIds: Set<string>, messageId: string, max = 300): void {
  seenIds.add(messageId);
  if (seenIds.size > max) {
    const trimmed = Array.from(seenIds).slice(-Math.floor(max / 3));
    seenIds.clear();
    for (const id of trimmed) seenIds.add(id);
  }
}

/**
 * After an offline outbox flush succeeds, replace the optimistic clientId row
 * with the server-confirmed message.
 */
export function reconcileOutboxFlush<T extends ChatMessageLike>(
  prev: T[],
  clientId: string,
  serverMessage: T
): T[] {
  return upsertChatMessage(prev, serverMessage, { replaceClientId: clientId });
}
