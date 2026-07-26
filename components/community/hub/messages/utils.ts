import { format, formatDistanceToNow, isSameDay, isToday, isYesterday } from "date-fns";
import type { Msg } from "@/types";
import type { HubChatMessage, HubMessageAttachment } from "./types";

export function conversationKey(kind: "direct" | "group" | "space", id: string, roomId?: string | null) {
  if (kind === "group" && roomId) return `room:${roomId}`;
  if (kind === "group" && id.startsWith("room:")) return id;
  if (kind === "space") return id.startsWith("space:") ? id : `space:${id}`;
  return `inbox:${id}`;
}

export function formatShortTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diff)) return "";
  if (diff < 60_000) return "now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  if (diff < 86_400_000 * 7) return `${Math.floor(diff / 86_400_000)}d`;
  return formatDistanceToNow(new Date(iso), { addSuffix: false });
}

export function formatMessageTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function formatDayLabel(day: Date) {
  if (isToday(day)) return "Today";
  if (isYesterday(day)) return "Yesterday";
  return format(day, "EEEE, MMM d");
}

export function formatFileSize(bytes?: number) {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function extractLinks(text: string) {
  const re = /https?:\/\/[^\s<>"']+/gi;
  return text.match(re) ?? [];
}

export function isImageAttachment(a: HubMessageAttachment) {
  return !!a.mime?.startsWith("image/") || /\.(png|jpe?g|gif|webp|avif)(\?|$)/i.test(a.url ?? "");
}

export function isVideoAttachment(a: HubMessageAttachment) {
  return !!a.mime?.startsWith("video/") || /\.(mp4|webm|mov)(\?|$)/i.test(a.url ?? "");
}

export function isAudioAttachment(a: HubMessageAttachment, messageType?: string) {
  return messageType === "audio" || !!a.mime?.startsWith("audio/");
}

export function countReactions(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, number> = {};
  for (const [emoji, users] of Object.entries(raw as Record<string, unknown>)) {
    if (Array.isArray(users)) out[emoji] = users.length;
    else if (typeof users === "number") out[emoji] = users;
  }
  return out;
}

export function reactionUsers(raw: unknown): Record<string, string[]> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, string[]> = {};
  for (const [emoji, users] of Object.entries(raw as Record<string, unknown>)) {
    if (Array.isArray(users)) out[emoji] = users.map(String);
  }
  return out;
}

export function msgToHubMessage(
  m: Msg,
  deliveryStatus?: HubChatMessage["deliveryStatus"],
  highlightQuery?: string | null
): HubChatMessage {
  return {
    id: m.id,
    body: m.body,
    sender_id: m.sender_id,
    sender_name: m.profiles?.full_name || m.profiles?.username || "Member",
    sender_avatar: m.profiles?.avatar_url ?? null,
    created_at: m.created_at,
    message_type: m.message_type,
    attachments: Array.isArray(m.attachments)
      ? (m.attachments as HubMessageAttachment[])
      : [],
    reactions: countReactions(m.reactions),
    reactionUsers: reactionUsers(m.reactions),
    reply_to_id: m.reply_to_id ?? null,
    reply_to_body: m.reply_to_body ?? null,
    reply_to_sender: m.reply_to_sender ?? null,
    thread_id: m.thread_id ?? null,
    reply_count: m.reply_count ?? 0,
    is_pinned: m.is_pinned ?? false,
    is_edited: m.is_edited ?? false,
    deliveryStatus,
    highlightQuery: highlightQuery ?? null,
  };
}

export function resolveOwnDeliveryStatus(
  createdAt: string,
  peerLastReadAt: string | null | undefined,
  peerOnline: boolean
): HubChatMessage["deliveryStatus"] {
  if (peerLastReadAt && new Date(createdAt).getTime() <= new Date(peerLastReadAt).getTime()) {
    return "seen";
  }
  if (peerOnline || peerLastReadAt) return "delivered";
  return "sent";
}

export function groupMessagesByDay(messages: HubChatMessage[]) {
  const groups: Array<{ day: Date; label: string; messages: HubChatMessage[] }> = [];
  for (const msg of messages) {
    const day = new Date(msg.created_at);
    const last = groups[groups.length - 1];
    if (!last || !isSameDay(last.day, day)) {
      groups.push({ day, label: formatDayLabel(day), messages: [msg] });
    } else {
      last.messages.push(msg);
    }
  }
  return groups;
}

const PINNED_KEY = "jimvio.messages.pinnedThreads";

export function loadPinnedThreadIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PINNED_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function savePinnedThreadIds(ids: string[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PINNED_KEY, JSON.stringify(ids));
}

export function topPercentFromLevel(level: number) {
  if (level >= 20) return "Top 5% Creators";
  if (level >= 12) return "Top 15% Creators";
  if (level >= 6) return "Rising Creator";
  return null;
}
