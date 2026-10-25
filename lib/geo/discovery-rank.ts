/**
 * Bounded location boosts for discovery.
 * A country match can reorder close results. It cannot bury a much stronger
 * global result, and it never grants access to private content.
 */

import { normalizeCountryCode } from "@/lib/geo/buyer-country";

export const LOCATION_BOOST_CAP = 8;

const AFRICAN_COUNTRIES = new Set([
  "RW", "KE", "UG", "TZ", "NG", "ZA", "GH", "ET", "EG", "MA",
]);

const COUNTRY_NAMES: Array<[string, string]> = [
  ["united states of america", "US"],
  ["united states", "US"],
  ["united kingdom", "GB"],
  ["great britain", "GB"],
  ["south africa", "ZA"],
  ["south korea", "KR"],
  ["united arab emirates", "AE"],
  ["saudi arabia", "SA"],
  ["new zealand", "NZ"],
  ["rwanda", "RW"],
  ["kenya", "KE"],
  ["uganda", "UG"],
  ["tanzania", "TZ"],
  ["nigeria", "NG"],
  ["ghana", "GH"],
  ["ethiopia", "ET"],
  ["egypt", "EG"],
  ["morocco", "MA"],
  ["canada", "CA"],
  ["germany", "DE"],
  ["france", "FR"],
  ["india", "IN"],
  ["brazil", "BR"],
];

function mentionsCountry(text: string, name: string): boolean {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|[^a-z])${escaped}(?:$|[^a-z])`, "i").test(text);
}

/** Read a country from a community region label. Does not read post text. */
export function countryFromRegionLabel(region: string | null | undefined): string | null {
  if (!region) return null;
  const direct = normalizeCountryCode(region.trim());
  if (direct) return direct;
  const text = region.trim().toLowerCase();
  for (const [name, code] of COUNTRY_NAMES) {
    if (mentionsCountry(text, name)) return code;
  }
  return null;
}

export function communityLocationBoost(
  region: string | null | undefined,
  viewerCountry: string | null | undefined,
): number {
  const viewer = normalizeCountryCode(viewerCountry);
  if (!viewer || !region?.trim()) return 0;
  const contentCountry = countryFromRegionLabel(region);
  if (contentCountry && contentCountry === viewer) return LOCATION_BOOST_CAP;
  const label = region.trim().toLowerCase();
  if (
    (label === "africa" || label === "east africa" || label === "african") &&
    AFRICAN_COUNTRIES.has(viewer)
  ) {
    return 3;
  }
  return 0;
}

export function rankWithBoundedLocationBoost<T extends { id: string; region?: string | null }>(
  items: T[],
  viewerCountry: string | null | undefined,
  score: (item: T) => number,
): T[] {
  if (!normalizeCountryCode(viewerCountry)) return items;
  return [...items].sort((a, b) => {
    const scoreA = score(a);
    const scoreB = score(b);
    const gap = scoreB - scoreA;
    if (Math.abs(gap) > LOCATION_BOOST_CAP) return gap > 0 ? 1 : -1;
    const boosted =
      scoreB +
      communityLocationBoost(b.region, viewerCountry) -
      (scoreA + communityLocationBoost(a.region, viewerCountry));
    if (boosted !== 0) return boosted > 0 ? 1 : -1;
    return a.id.localeCompare(b.id);
  });
}

export function feedRegionOf(item: {
  community_region?: string | null;
  communities?: { region?: string | null } | null;
}): string | null {
  if (typeof item.community_region === "string") return item.community_region;
  return item.communities?.region ?? null;
}
