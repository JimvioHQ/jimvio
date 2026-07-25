/**
 * Shared sanitization for community post image URLs (Cloudinary / Tenor / Giphy).
 */

import { sanitizeChatAttachments } from "@/lib/community/chat/sanitize-attachments";

/** Accept either string URLs or {url} objects; return trusted HTTPS URLs only. */
export function sanitizePostImageUrls(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const asAttachments = input
    .map((item) => {
      if (typeof item === "string") {
        return { url: item, name: "image", mime: "image/jpeg", size: 0 };
      }
      if (item && typeof item === "object" && typeof (item as { url?: unknown }).url === "string") {
        const row = item as { url: string; name?: string; mime?: string; size?: number };
        return {
          url: row.url,
          name: row.name || "image",
          mime: row.mime || "image/jpeg",
          size: typeof row.size === "number" ? row.size : 0,
        };
      }
      return null;
    })
    .filter(Boolean);

  const sanitized = sanitizeChatAttachments(asAttachments);
  if (!sanitized.ok) return [];
  return sanitized.attachments.map((a) => a.url);
}

/** Sanitize post file/link attachments the same way as chat attachments. */
export function sanitizePostAttachments(input: unknown) {
  const sanitized = sanitizeChatAttachments(input);
  if (!sanitized.ok) return [];
  return sanitized.attachments;
}
