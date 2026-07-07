"use client";

import { readNavSearchHistory } from "@/lib/marketplace-search-history";
import type { PersonalizationSignals, ViewedProductStub } from "./types";

const RECENTLY_VIEWED_KEY = "recently_viewed";
const MARKETPLACE_SEARCH_KEY = "marketplace_recent_searches_v1";

type StoredViewedProduct = ViewedProductStub;

function readRecentlyViewed(): StoredViewedProduct[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENTLY_VIEWED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is StoredViewedProduct =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as StoredViewedProduct).id === "string" &&
        typeof (item as StoredViewedProduct).name === "string" &&
        typeof (item as StoredViewedProduct).slug === "string",
    );
  } catch {
    return [];
  }
}

function readMarketplaceSearchHistory(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(MARKETPLACE_SEARCH_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
  } catch {
    return [];
  }
}

function detectCountryCode(): string {
  if (typeof window === "undefined") return "US";
  try {
    const locale = navigator.language || "en-US";
    const region = new Intl.Locale(locale).region;
    return region ?? locale.split("-")[1]?.toUpperCase() ?? "US";
  } catch {
    return "US";
  }
}

function detectLanguage(): string {
  if (typeof window === "undefined") return "en";
  try {
    return (
      document.documentElement.lang ||
      navigator.language?.split("-")[0] ||
      "en"
    );
  } catch {
    return "en";
  }
}

/** Read-only client signal collector — no network calls. */
export function collectPersonalizationSignals(
  cartProductIds: string[] = [],
  wishlistProductIds: string[] = [],
): PersonalizationSignals {
  const viewed = readRecentlyViewed();
  const navSearches = readNavSearchHistory();
  const marketplaceSearches = readMarketplaceSearchHistory();

  const searchTerms = [
    ...new Set(
      [...marketplaceSearches, ...navSearches]
        .map((t) => t.trim())
        .filter(Boolean),
    ),
  ].slice(0, 12);

  return {
    viewedProductIds: viewed.map((v) => v.id),
    viewedProducts: viewed,
    viewedCategoryIds: [
      ...new Set(
        viewed
          .map((v) => v.category_id)
          .filter((id): id is string => typeof id === "string" && id.length > 0),
      ),
    ],
    cartProductIds,
    wishlistProductIds,
    searchTerms,
    countryCode: detectCountryCode(),
    language: detectLanguage(),
    creatorInterestTags: [],
  };
}
