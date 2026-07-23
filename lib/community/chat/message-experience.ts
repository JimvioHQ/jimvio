/**
 * Message Experience Engine — pure helpers (Phase 2).
 * Collaboration-object utilities shared by MessageCard, panels, and search.
 */

import { parseAttachments } from "@/lib/utils";
import type { Attachment, Msg } from "@/types";

export type MessageSearchScope =
  | "messages"
  | "knowledge"
  | "threads"
  | "files"
  | "media"
  | "members"
  | "groups"
  | "channels"
  | "courses"
  | "products"
  | "services"
  | "affiliates"
  | "creators"
  | "communities"
  | "events"
  | "pinned";

export type FileKind = "image" | "video" | "audio" | "pdf" | "document" | "other";

export type RichSegment =
  | { type: "text"; value: string }
  | { type: "link"; value: string; href: string }
  | { type: "mention"; value: string }
  | { type: "hashtag"; value: string }
  | { type: "code"; value: string }
  | { type: "codeblock"; value: string };

export function classifyFile(att: Attachment): FileKind {
  const mime = (att.mime ?? "").toLowerCase();
  const name = (att.name ?? att.url ?? "").toLowerCase();
  if (mime.startsWith("image/") || /\.(png|jpe?g|gif|webp|avif|svg)(\?|$)/i.test(name))
    return "image";
  if (mime.startsWith("video/") || /\.(mp4|webm|mov|m4v)(\?|$)/i.test(name)) return "video";
  if (mime.startsWith("audio/") || /\.(mp3|wav|ogg|m4a|aac)(\?|$)/i.test(name))
    return "audio";
  if (mime === "application/pdf" || /\.pdf(\?|$)/i.test(name)) return "pdf";
  if (
    mime.includes("document") ||
    mime.includes("msword") ||
    mime.includes("sheet") ||
    mime.includes("presentation") ||
    /\.(docx?|xlsx?|pptx?|txt|csv|rtf)(\?|$)/i.test(name)
  )
    return "document";
  return "other";
}

export function messageAttachments(m: Msg): Attachment[] {
  return parseAttachments(m.attachments);
}

export function isMediaMessage(m: Msg): boolean {
  if (["image", "file", "audio", "video"].includes(m.message_type)) return true;
  return messageAttachments(m).some((a) => {
    const k = classifyFile(a);
    return k === "image" || k === "video" || k === "audio";
  });
}

export function isFileMessage(m: Msg): boolean {
  return messageAttachments(m).some((a) => {
    const k = classifyFile(a);
    return k === "pdf" || k === "document" || k === "other" || k === "image" || k === "video";
  });
}

export function extractPinned(messages: Msg[]): Msg[] {
  return messages
    .filter((m) => m.is_pinned && !m.thread_id && !m.is_deleted)
    .sort((a, b) => {
      const at = a.pinned_at ?? a.created_at;
      const bt = b.pinned_at ?? b.created_at;
      return new Date(bt).getTime() - new Date(at).getTime();
    });
}

export function extractMediaItems(
  messages: Msg[]
): { message: Msg; attachment: Attachment; kind: FileKind }[] {
  const out: { message: Msg; attachment: Attachment; kind: FileKind }[] = [];
  for (const m of messages) {
    if (m.is_deleted) continue;
    for (const a of messageAttachments(m)) {
      const kind = classifyFile(a);
      if (kind === "image" || kind === "video" || kind === "audio") {
        out.push({ message: m, attachment: a, kind });
      }
    }
  }
  return out;
}

export function extractFileItems(
  messages: Msg[]
): { message: Msg; attachment: Attachment; kind: FileKind }[] {
  const out: { message: Msg; attachment: Attachment; kind: FileKind }[] = [];
  for (const m of messages) {
    if (m.is_deleted) continue;
    for (const a of messageAttachments(m)) {
      out.push({ message: m, attachment: a, kind: classifyFile(a) });
    }
  }
  return out;
}

export function extractThreads(messages: Msg[]): Msg[] {
  return messages.filter(
    (m) => !m.thread_id && !m.is_deleted && (m.reply_count ?? 0) > 0
  );
}

export function parseRichText(body: string): RichSegment[] {
  if (!body) return [];

  const blocks: RichSegment[] = [];
  const blockRe = /```([\s\S]*?)```/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = blockRe.exec(body)) !== null) {
    if (m.index > last) blocks.push(...parseInline(body.slice(last, m.index)));
    blocks.push({ type: "codeblock", value: m[1].replace(/^\n|\n$/g, "") });
    last = m.index + m[0].length;
  }
  if (last < body.length) blocks.push(...parseInline(body.slice(last)));
  return blocks.length ? blocks : [{ type: "text", value: body }];
}

function parseInline(text: string): RichSegment[] {
  const tokens: RichSegment[] = [];
  const chunks: { text?: string; code?: string }[] = [];
  const codeRe = /`([^`]+)`/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = codeRe.exec(text)) !== null) {
    if (m.index > last) chunks.push({ text: text.slice(last, m.index) });
    chunks.push({ code: m[1] });
    last = m.index + m[0].length;
  }
  if (last < text.length) chunks.push({ text: text.slice(last) });
  if (chunks.length === 0) chunks.push({ text });

  for (const chunk of chunks) {
    if (chunk.code !== undefined) {
      tokens.push({ type: "code", value: chunk.code });
      continue;
    }
    tokens.push(...tokenizePlain(chunk.text ?? ""));
  }
  return tokens;
}

function tokenizePlain(text: string): RichSegment[] {
  if (!text) return [];
  const combined =
    /(https?:\/\/[^\s<]+[^\s<.,;:!?)\]}'"])|(@[\w.-]{2,32})|(#[\w]{2,48})/g;
  const out: RichSegment[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = combined.exec(text)) !== null) {
    if (m.index > last) out.push({ type: "text", value: text.slice(last, m.index) });
    if (m[1]) out.push({ type: "link", value: m[1], href: m[1] });
    else if (m[2]) out.push({ type: "mention", value: m[2] });
    else if (m[3]) out.push({ type: "hashtag", value: m[3] });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ type: "text", value: text.slice(last) });
  return out.length ? out : [{ type: "text", value: text }];
}

export function messageDeepLink(messageId: string, baseHref?: string): string {
  const base =
    baseHref ??
    (typeof window !== "undefined" ? window.location.href.split("#")[0] : "");
  return `${base}#msg-${messageId}`;
}

export function displayName(m: Msg): string {
  return m.profiles?.full_name || m.profiles?.username || "Member";
}

export function formatFileSize(bytes?: number | null): string {
  if (bytes == null || Number.isNaN(bytes)) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Quote / list detection for body preview styling */
export function isQuotedLine(line: string): boolean {
  return /^\s*>\s?/.test(line);
}

export function isListLine(line: string): boolean {
  return /^\s*([-*•]|\d+\.)\s+/.test(line);
}
