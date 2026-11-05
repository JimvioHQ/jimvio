import type { ScanCategory } from "./types";

export const PRODUCT_KINDS = new Set(["pdf", "office", "ebook", "archive", "executable", "text"]);
export const MEDIA_KINDS = new Set(["image", "video", "audio"]);

/**
 * Which one verification experience applies. A file decides by its real
 * type (read from its bytes, not its name); a link by its platform, and
 * after a safe fetch by what the server actually returned.
 */
export function categoryFor(input: { fileKind: string | null; social: boolean; servedKind?: string | null }): ScanCategory {
  if (input.fileKind) {
    if (MEDIA_KINDS.has(input.fileKind)) return "media";
    if (PRODUCT_KINDS.has(input.fileKind)) return "product";
    return "unsupported";
  }
  if (input.social) return "engagement";
  if (input.servedKind && MEDIA_KINDS.has(input.servedKind)) return "media";
  if (input.servedKind === "pdf" || input.servedKind === "ebook") return "product";
  return "links";
}
