/**
 * Shared conversation message helpers — one merge/dedupe path for room + inbox.
 */

import type { Msg } from "@/types";

const PAGE_SIZE = 50;

/** `slug: null` = platform-wide direct message (no community). Same tables + realtime either way. */
export type ConversationTarget =
  | { kind: "room"; roomId: string }
  | { kind: "inbox"; slug: string | null; conversationId: string };

/** API base for a 1:1 conversation: community DM or platform-wide DM. */
export function inboxApiBase(slug: string | null | undefined, conversationId: string): string {
  return slug
    ? `/api/communities/${encodeURIComponent(slug)}/inbox/${conversationId}/messages`
    : `/api/messages/direct/${conversationId}/messages`;
}

/** Hub outbox / optimistic client ids use this prefix. */
export function isOptimisticMessageId(id: string): boolean {
  return id.startsWith("opt:");
}

export function messagesUrl(target: ConversationTarget, opts?: { before?: string; limit?: number }): string {
  const limit = opts?.limit ?? PAGE_SIZE;
  const params = new URLSearchParams({ limit: String(limit) });
  if (opts?.before) params.set("before", opts.before);

  if (target.kind === "room") {
    return `/api/messages/${target.roomId}?${params.toString()}`;
  }
  return `${inboxApiBase(target.slug, target.conversationId)}?${params.toString()}`;
}

/**
 * Merge messages by authoritative id, then drop optimistic rows that already
 * have a matching server message (same sender + body within a short window).
 */
export function mergeMessages(existing: Msg[], incoming: Msg[], mode: "append" | "prepend" | "replace"): Msg[] {
  if (mode === "replace") {
    return reconcileOptimistic(dedupeSort(incoming));
  }
  const map = new Map<string, Msg>();
  const ordered = mode === "prepend" ? [...incoming, ...existing] : [...existing, ...incoming];
  for (const m of ordered) {
    if (!m?.id) continue;
    const prev = map.get(m.id);
    map.set(m.id, prev ? { ...prev, ...m } : m);
  }
  return reconcileOptimistic(
    [...map.values()].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
  );
}

export function dedupeSort(messages: Msg[]): Msg[] {
  const map = new Map<string, Msg>();
  for (const m of messages) {
    if (!m?.id) continue;
    map.set(m.id, m);
  }
  return reconcileOptimistic(
    [...map.values()].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
  );
}

/**
 * Remove optimistic (`opt:…`) rows once a real server message exists for the
 * same sender/body (within 2 minutes). Never dedupe by text alone across users.
 */
export function reconcileOptimistic(messages: Msg[]): Msg[] {
  const server = messages.filter((m) => !isOptimisticMessageId(m.id));
  if (server.length === messages.length) return messages;

  const keptOptimistic: Msg[] = [];
  for (const opt of messages) {
    if (!isOptimisticMessageId(opt.id)) continue;
    const optTs = new Date(opt.created_at).getTime();
    const matched = server.some((s) => {
      if (s.sender_id !== opt.sender_id) return false;
      if ((s.body ?? "") !== (opt.body ?? "")) return false;
      const delta = Math.abs(new Date(s.created_at).getTime() - optTs);
      return delta < 120_000;
    });
    if (!matched) keptOptimistic.push(opt);
  }
  return [...server, ...keptOptimistic].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
}

export function oldestCursor(messages: Msg[]): string | null {
  if (messages.length === 0) return null;
  return messages[0]?.created_at ?? null;
}

export async function fetchConversationPage(
  target: ConversationTarget,
  opts?: { before?: string; limit?: number; signal?: AbortSignal }
): Promise<{ messages: Msg[]; nextCursor: string | null }> {
  const res = await fetch(messagesUrl(target, opts), { signal: opts?.signal });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : "Failed to load messages");
  }
  const messages = (data.messages ?? []) as Msg[];
  const nextCursor =
    typeof data.nextCursor === "string"
      ? data.nextCursor
      : messages.length >= (opts?.limit ?? PAGE_SIZE)
        ? oldestCursor(messages)
        : null;
  return { messages, nextCursor };
}

export const CONVERSATION_PAGE_SIZE = PAGE_SIZE;
