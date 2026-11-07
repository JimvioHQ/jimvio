import { countryDisplayName, normalizeCountryCode } from "@/lib/geo/buyer-country";

/**
 * Public profiles show country only — never city — using the canonical name
 * for ISO codes (e.g. RW → Rwanda). Does not mutate stored profile data.
 */
export function formatPublicCountry(
  country: string | null | undefined,
  locale = "en",
): string | null {
  const raw = country?.trim();
  if (!raw) return null;

  const code = normalizeCountryCode(raw);
  if (code) {
    const name = countryDisplayName(code, locale);
    return name || raw;
  }

  // Already a full country name (or unknown string) — show as-is, never guess.
  // Reject values that look like "City, XX" combinations.
  if (/,/.test(raw)) {
    const parts = raw.split(",").map((p) => p.trim()).filter(Boolean);
    const last = parts[parts.length - 1];
    const lastCode = normalizeCountryCode(last);
    if (lastCode) return countryDisplayName(lastCode, locale);
    return null;
  }

  return raw;
}

/** Short header bio: first sentence or ~140 chars of the full biography. */
export function shortBioPreview(bio: string | null | undefined, max = 140): string | null {
  const text = bio?.replace(/\s+/g, " ").trim();
  if (!text) return null;
  const sentence = text.match(/^(.+?[.!?])(?:\s|$)/);
  const candidate = (sentence?.[1] ?? text).trim();
  if (candidate.length <= max) return candidate;
  return `${candidate.slice(0, max - 1).trimEnd()}…`;
}
