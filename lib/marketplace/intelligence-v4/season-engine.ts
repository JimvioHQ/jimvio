/**
 * Season Engine v4 — detect active seasons and match products.
 */

import type { SeasonContext } from "./types";

export interface SeasonDefinition {
  key: string;
  label: string;
  months: number[];
  keywords: string[];
}

export const SEASON_DEFINITIONS: SeasonDefinition[] = [
  { key: "christmas", label: "Christmas", months: [11, 12], keywords: ["christmas", "holiday", "gift", "santa", "xmas", "winter"] },
  { key: "black_friday", label: "Black Friday", months: [11], keywords: ["black friday", "deal", "sale", "discount"] },
  { key: "valentine", label: "Valentine's Day", months: [1, 2], keywords: ["valentine", "love", "romantic", "heart", "couple"] },
  { key: "summer", label: "Summer", months: [6, 7, 8], keywords: ["summer", "beach", "outdoor", "swim", "sun"] },
  { key: "winter", label: "Winter", months: [12, 1, 2], keywords: ["winter", "warm", "coat", "snow", "cold"] },
  { key: "ramadan", label: "Ramadan", months: [3, 4], keywords: ["ramadan", "eid", "islamic", "iftar"] },
  { key: "back_to_school", label: "Back To School", months: [8, 9], keywords: ["school", "student", "backpack", "study", "notebook"] },
  { key: "mothers_day", label: "Mother's Day", months: [5], keywords: ["mother", "mom", "mum", "gift for her"] },
  { key: "fathers_day", label: "Father's Day", months: [6], keywords: ["father", "dad", "gift for him"] },
  { key: "halloween", label: "Halloween", months: [10], keywords: ["halloween", "costume", "spooky", "pumpkin", "trick"] },
];

export function getActiveSeasons(date = new Date()): SeasonContext {
  const month = date.getMonth() + 1;
  const active = SEASON_DEFINITIONS.filter((s) => s.months.includes(month));
  const keywords = active.flatMap((s) => s.keywords);

  return {
    activeSeasons: active.map((s) => s.key),
    keywords,
  };
}

export function matchProductToSeasons(
  productName: string,
  tags: string[] = [],
  date = new Date()
): string[] {
  const ctx = getActiveSeasons(date);
  const haystack = `${productName} ${tags.join(" ")}`.toLowerCase();
  const matched: string[] = [];

  for (const season of SEASON_DEFINITIONS) {
    if (!ctx.activeSeasons.includes(season.key)) continue;
    if (season.keywords.some((kw) => haystack.includes(kw))) {
      matched.push(season.key);
    }
  }

  return matched;
}

export function seasonBoostScore(
  productName: string,
  tags: string[] = [],
  date = new Date()
): number {
  const matches = matchProductToSeasons(productName, tags, date);
  if (matches.length === 0) return 0;
  return Math.min(25, matches.length * 12);
}
