import { sanitizeSearchTerm } from "@/lib/marketplace/search-engine";

export const VISUAL_SEARCH_MAX_BYTES = 4 * 1024 * 1024;
export const VISUAL_SEARCH_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

const DATA_URL =
  /^data:image\/(jpeg|png|webp);base64,([a-z0-9+/=\s]+)$/i;

export function validateVisualFile(file: { type: string; size: number }): { ok: true } | { ok: false; error: string } {
  if (!VISUAL_SEARCH_TYPES.includes(file.type as (typeof VISUAL_SEARCH_TYPES)[number])) {
    return { ok: false, error: "Use a JPEG, PNG, or WebP photo." };
  }
  if (!Number.isFinite(file.size) || file.size <= 0) {
    return { ok: false, error: "That file is empty." };
  }
  if (file.size > VISUAL_SEARCH_MAX_BYTES) {
    return { ok: false, error: "Choose a photo under 4 MB." };
  }
  return { ok: true };
}

export function parseVisualDataUrl(value: string): { mediaType: string; bytes: number } | null {
  const match = DATA_URL.exec(value.trim());
  if (!match) return null;
  const payload = match[2].replace(/\s/g, "");
  const bytes = Math.floor((payload.length * 3) / 4);
  if (bytes <= 0 || bytes > VISUAL_SEARCH_MAX_BYTES) return null;
  const mediaType = match[1].toLowerCase() === "jpg" ? "image/jpeg" : `image/${match[1].toLowerCase()}`;
  return { mediaType, bytes };
}

/** Pull a short catalog query from the model. Empty means the photo is not searchable. */
export function parseVisualQuery(text: string): string {
  const raw = text.trim();
  if (!raw) return "";
  let query = "";
  try {
    const jsonText = raw.match(/\{[\s\S]*\}/)?.[0] ?? raw;
    const parsed = JSON.parse(jsonText) as { query?: unknown };
    query = typeof parsed.query === "string" ? parsed.query : "";
  } catch {
    query = "";
  }
  const cleaned = sanitizeSearchTerm(query).replace(/\s+/g, " ").trim();
  if (cleaned.length < 2 || cleaned.length > 80) return "";
  return cleaned;
}
