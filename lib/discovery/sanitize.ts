/** Query sanitization + light typo-tolerant term expansion. */

import { expandSearchTerms, sanitizeSearchTerm } from "@/lib/marketplace/search-engine";

export { sanitizeSearchTerm, expandSearchTerms };

/** Escape ILIKE wildcards for PostgREST patterns. */
export function escapeIlike(raw: string): string {
  return raw.replace(/[%_\\]/g, (ch) => `\\${ch}`);
}

export function ilikePattern(raw: string): string {
  return `%${escapeIlike(sanitizeSearchTerm(raw))}%`;
}

/**
 * Lightweight typo helpers: generate 1-edit prefix variants for short terms
 * so ILIKE can still catch near-misses without a full fuzzy engine.
 */
export function typoTolerantTerms(query: string): string[] {
  const base = sanitizeSearchTerm(query).toLowerCase();
  if (!base) return [];
  const terms = new Set<string>(expandSearchTerms(base));
  const words = base.split(/\s+/).filter((w) => w.length >= 3 && w.length <= 12);
  for (const word of words) {
    // Drop middle char (common typo)
    if (word.length >= 4) {
      const mid = Math.floor(word.length / 2);
      terms.add(word.slice(0, mid) + word.slice(mid + 1));
    }
    // Swap adjacent chars once
    for (let i = 0; i < word.length - 1 && i < 4; i++) {
      const chars = word.split("");
      [chars[i], chars[i + 1]] = [chars[i + 1], chars[i]];
      terms.add(chars.join(""));
    }
  }
  return Array.from(terms).slice(0, 12);
}
