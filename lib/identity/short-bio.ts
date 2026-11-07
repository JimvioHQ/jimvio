/**
 * Three-line short professional bio for the public profile header.
 * Stored in jip_identity.privacy_custom.shortBioLines (additive, no migration).
 */

export const SHORT_BIO_LINE_MAX = 120;
export const SHORT_BIO_LINES = 3;

export type ShortBioLines = [string, string, string];

export function sanitizeShortBioLines(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((line) => (typeof line === "string" ? line.replace(/\s+/g, " ").trim() : ""))
    .map((line) => line.slice(0, SHORT_BIO_LINE_MAX))
    .filter(Boolean)
    .slice(0, SHORT_BIO_LINES);
}

export function shortBioLinesFromCustom(
  privacyCustom: Record<string, unknown> | null | undefined,
): string[] {
  return sanitizeShortBioLines(privacyCustom?.shortBioLines);
}

/**
 * Prefer saved short bio lines. Otherwise derive up to three clean sentences
 * from the full biography (no invented claims). Returns [] when nothing usable.
 */
export function resolveShortBioLines(opts: {
  shortBioLines?: string[] | null;
  bio?: string | null;
}): string[] {
  const saved = sanitizeShortBioLines(opts.shortBioLines);
  if (saved.length > 0) return saved.slice(0, SHORT_BIO_LINES);

  const bio = opts.bio?.replace(/\s+/g, " ").trim() ?? "";
  if (!bio) return [];

  // Strip common emoji clutter for header presentation.
  const cleaned = bio
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return [];

  const sentences = cleaned
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 12);

  const unique: string[] = [];
  for (const s of sentences) {
    const normalized = s.toLowerCase();
    if (unique.some((u) => u.toLowerCase() === normalized)) continue;
    unique.push(s.slice(0, SHORT_BIO_LINE_MAX));
    if (unique.length >= SHORT_BIO_LINES) break;
  }
  return unique;
}

/**
 * Pick a meaningful phrase from the first sentence for bold-italic emphasis.
 * Falls back to the first 3–5 words when no strong phrase is found.
 */
export function emphasizePhrase(sentence: string): { before: string; emphasis: string; after: string } {
  const text = sentence.trim();
  if (!text) return { before: "", emphasis: "", after: "" };

  const patterns = [
    /\b(clear,?\s+structured\s+investment\s+planning)\b/i,
    /\b(structured\s+investment\s+plans?(?:\s+&\s+portfolio\s+management)?)\b/i,
    /\b(portfolio\s+management)\b/i,
    /\b(professional\s+investing)\b/i,
    /\b(ai[- ]powered\s+[\w\s]{0,24})\b/i,
    /\b(investment\s+platform)\b/i,
  ];

  for (const re of patterns) {
    const match = text.match(re);
    if (match?.index != null && match[0]) {
      const start = match.index;
      const end = start + match[0].length;
      return {
        before: text.slice(0, start),
        emphasis: text.slice(start, end),
        after: text.slice(end),
      };
    }
  }

  const words = text.split(/\s+/);
  if (words.length <= 4) {
    return { before: "", emphasis: text, after: "" };
  }
  const take = Math.min(5, Math.max(3, Math.floor(words.length / 3)));
  const emphasis = words.slice(0, take).join(" ");
  return { before: "", emphasis, after: text.slice(emphasis.length) };
}

export function mergeShortBioIntoPrivacyCustom(
  existing: Record<string, unknown> | null | undefined,
  lines: string[],
): Record<string, unknown> {
  const next = { ...(existing ?? {}) };
  const cleaned = sanitizeShortBioLines(lines);
  if (cleaned.length === 0) {
    delete next.shortBioLines;
  } else {
    next.shortBioLines = cleaned;
  }
  return next;
}
