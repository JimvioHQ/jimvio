/**
 * Pure helpers for marketplace (buyer ↔ store) conversations in the unified inbox.
 */

export const MARKETPLACE_THREAD_PREFIX = "mkt:";
export const MARKETPLACE_PAGE_SIZE = 50;

export const marketplaceThreadId = (conversationId: string) => `${MARKETPLACE_THREAD_PREFIX}${conversationId}`;

export function parseMarketplaceThreadId(threadId: string | null | undefined): string | null {
  if (!threadId || !threadId.startsWith(MARKETPLACE_THREAD_PREFIX)) return null;
  const id = threadId.slice(MARKETPLACE_THREAD_PREFIX.length);
  return id || null;
}

/** Read-cursor key in messaging_conversation_reads. */
export const marketplaceReadKey = (conversationId: string) => `market:${conversationId}`;

export function previewMarketplaceMessage(body: string | null | undefined, messageType: string | null | undefined): string {
  switch (messageType) {
    case "product":
      return "Shared a product";
    case "quote_request":
      return "Quote request";
    case "quote_reply":
      return "Sent an offer";
    case "image":
      return "Sent a photo";
    case "file":
      return "Sent a file";
    default:
      return (body ?? "").trim().slice(0, 120) || "No messages yet";
  }
}

type Timed = { id: string; created_at: string };

/** Merge by id (later copy wins), oldest first. Safe for realtime echoes and page loads. */
export function mergeTimeline<T extends Timed>(existing: T[], incoming: T[]): T[] {
  const map = new Map<string, T>();
  for (const m of [...existing, ...incoming]) if (m?.id) map.set(m.id, { ...(map.get(m.id) ?? {}), ...m });
  return [...map.values()].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}

/** Unread when the newest message is from the other side and newer than my read cursor. */
export function isMarketplaceUnread(
  last: { sender_id: string; created_at: string } | null | undefined,
  userId: string,
  lastReadAt: string | null | undefined
): boolean {
  if (!last || last.sender_id === userId) return false;
  if (!lastReadAt) return true;
  return new Date(last.created_at).getTime() > new Date(lastReadAt).getTime();
}
