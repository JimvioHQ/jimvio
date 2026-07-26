/**
 * Local offline outbox for hub Messages — queues failed/offline sends and retries.
 * Client-only; never stores secrets.
 */

import type { ChatAttachmentPayload } from "@/lib/community-chat-upload";

export type HubOutboxItem = {
  clientId: string;
  threadId: string;
  kind: "direct" | "group";
  communitySlug: string | null;
  roomId: string | null;
  body: string;
  attachments: ChatAttachmentPayload[];
  messageType?: string;
  replyToId?: string | null;
  replyToBody?: string | null;
  replyToSender?: string | null;
  createdAt: string;
  attempts: number;
  lastError?: string | null;
};

const KEY = "jimvio.messages.outbox.v1";
const MAX_ITEMS = 40;

export function loadOutbox(): HubOutboxItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((x): x is HubOutboxItem => !!x && typeof x === "object" && typeof (x as HubOutboxItem).clientId === "string")
      .slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
}

export function saveOutbox(items: HubOutboxItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
}

export function enqueueOutbox(item: HubOutboxItem) {
  const next = [item, ...loadOutbox().filter((x) => x.clientId !== item.clientId)];
  saveOutbox(next);
  return next;
}

export function removeOutbox(clientId: string) {
  const next = loadOutbox().filter((x) => x.clientId !== clientId);
  saveOutbox(next);
  return next;
}

export function patchOutbox(clientId: string, patch: Partial<HubOutboxItem>) {
  const next = loadOutbox().map((x) => (x.clientId === clientId ? { ...x, ...patch } : x));
  saveOutbox(next);
  return next;
}

export function newOutboxClientId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `opt:${crypto.randomUUID()}`;
  }
  return `opt:${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
