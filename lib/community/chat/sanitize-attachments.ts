/**
 * Server-side attachment allowlisting for community chat / inbox.
 * Rejects arbitrary URLs so stored XSS and phishing payloads cannot persist.
 */

import type { ChatAttachmentPayload } from "@/lib/community-chat-upload";

const MAX_ATTACHMENTS = 10;
const MAX_NAME_LEN = 240;
const MAX_URL_LEN = 2048;
const MAX_SIZE = 50 * 1024 * 1024;

const ALLOWED_HOST_SUFFIXES = [
  ".cloudinary.com",
  ".tenor.com",
  ".giphy.com",
] as const;

const BLOCKED_IMAGE_MIMES = new Set(["image/svg+xml", "image/svg"]);

function isAllowedHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host === "cloudinary.com" || host === "tenor.com" || host === "giphy.com") {
    return true;
  }
  return ALLOWED_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix));
}

function isHttpsUrl(raw: string): URL | null {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > MAX_URL_LEN) {
    return null;
  }
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return null;
    if (!isAllowedHost(u.hostname)) return null;
    return u;
  } catch {
    return null;
  }
}

function looksLikeSvg(name: string, mime: string): boolean {
  if (BLOCKED_IMAGE_MIMES.has(mime.toLowerCase())) return true;
  return /\.svg(\?|$)/i.test(name);
}

/**
 * Returns sanitized attachments or an error message.
 * Empty input → empty list (valid for text-only messages).
 */
export function sanitizeChatAttachments(
  input: unknown
): { ok: true; attachments: ChatAttachmentPayload[] } | { ok: false; error: string } {
  if (input == null) return { ok: true, attachments: [] };
  if (!Array.isArray(input)) {
    return { ok: false, error: "Invalid attachments" };
  }
  if (input.length > MAX_ATTACHMENTS) {
    return { ok: false, error: `At most ${MAX_ATTACHMENTS} attachments allowed` };
  }

  const out: ChatAttachmentPayload[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== "object") {
      return { ok: false, error: "Invalid attachment entry" };
    }
    const row = raw as Record<string, unknown>;
    const url = typeof row.url === "string" ? row.url.trim() : "";
    const name =
      typeof row.name === "string" && row.name.trim()
        ? row.name.trim().slice(0, MAX_NAME_LEN)
        : "file";
    const mime =
      typeof row.mime === "string" && row.mime.trim()
        ? row.mime.trim().slice(0, 120)
        : "application/octet-stream";
    const size =
      typeof row.size === "number" && Number.isFinite(row.size) && row.size >= 0
        ? Math.min(Math.floor(row.size), MAX_SIZE)
        : 0;
    const publicId =
      typeof row.publicId === "string" && row.publicId.trim()
        ? row.publicId.trim().slice(0, 500)
        : undefined;

    const parsed = isHttpsUrl(url);
    if (!parsed) {
      return { ok: false, error: "Attachment URL is not allowed" };
    }
    if (looksLikeSvg(name, mime)) {
      return { ok: false, error: "SVG attachments are not allowed" };
    }

    out.push({
      url: parsed.toString(),
      name,
      mime,
      size,
      ...(publicId ? { publicId } : {}),
    });
  }

  return { ok: true, attachments: out };
}

/** True when a URL is safe to embed (iframe / media) in the chat UI. */
export function isTrustedChatMediaUrl(url: string): boolean {
  return isHttpsUrl(url) !== null;
}

/** Escape `%` / `_` for PostgREST `ilike` patterns. */
export function escapeIlikePattern(q: string): string {
  return q.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

const INBOX_MESSAGE_TYPES = new Set([
  "text",
  "image",
  "file",
  "audio",
  "video",
  "call_start",
  "call_signal",
]);

/** Allowlist inbox message_type; reject spoofed signaling unless explicitly allowed by caller. */
export function sanitizeInboxMessageType(
  raw: unknown,
  opts?: { allowCallSignals?: boolean }
): string {
  const t = typeof raw === "string" ? raw.trim() : "text";
  if (!INBOX_MESSAGE_TYPES.has(t)) return "text";
  if (
    (t === "call_start" || t === "call_signal") &&
    !opts?.allowCallSignals
  ) {
    return "text";
  }
  return t;
}
