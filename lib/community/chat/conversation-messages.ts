/**
 * Shared conversation message helpers — one merge/dedupe path for room + inbox.
 */

import type { Msg } from "@/types";

const PAGE_SIZE = 50;

export type ConversationTarget =
  | { kind: "room"; roomId: string }
  | { kind: "inbox"; slug: string; conversationId: string };

export function messagesUrl(target: ConversationTarget, opts?: { before?: string; limit?: number }): string {
  const limit = opts?.limit ?? PAGE_SIZE;
  const params = new URLSearchParams({ limit: String(limit) });
  if (opts?.before) params.set("before", opts.before);

  if (target.kind === "room") {
    return `/api/messages/${target.roomId}?${params.toString()}`;
  }
  return `/api/communities/${encodeURIComponent(target.slug)}/inbox/${target.conversationId}/messages?${params.toString()}`;
}

export function mergeMessages(existing: Msg[], incoming: Msg[], mode: "append" | "prepend" | "replace"): Msg[] {
  if (mode === "replace") {
    return dedupeSort(incoming);
  }
  const map = new Map<string, Msg>();
  const ordered = mode === "prepend" ? [...incoming, ...existing] : [...existing, ...incoming];
  for (const m of ordered) {
    if (!m?.id) continue;
    const prev = map.get(m.id);
    map.set(m.id, prev ? { ...prev, ...m } : m);
  }
  return [...map.values()].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
}

export function dedupeSort(messages: Msg[]): Msg[] {
  const map = new Map<string, Msg>();
  for (const m of messages) {
    if (!m?.id) continue;
    map.set(m.id, m);
  }
  return [...map.values()].sort(
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
