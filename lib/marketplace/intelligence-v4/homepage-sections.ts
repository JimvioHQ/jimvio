/**
 * Homepage Intelligence v4 — ranked section feeds.
 */

import type { CustomerMatchInput, HomepageSection, MarketplaceProductSignals } from "./types";
import { rankByCustomerMatch } from "./customer-match";
import { rankAffiliatePicks } from "./affiliate-intelligence";

const SECTION_LIMIT = 12;

export interface HomepageIntelligenceInput {
  products: MarketplaceProductSignals[];
  rankScores: Map<string, number>;
  trendingScores: Map<string, number>;
  qualityScores: Map<string, number>;
  duplicateHidden: Set<string>;
  customer?: CustomerMatchInput;
  recentlyViewedIds: string[];
  cartProductIds: string[];
  newProductIds: string[];
  communityPicks: string[];
}

function visibleProducts(input: HomepageIntelligenceInput): MarketplaceProductSignals[] {
  return input.products.filter((p) => !input.duplicateHidden.has(p.productId));
}

function topBy(
  products: MarketplaceProductSignals[],
  scores: Map<string, number>,
  limit: number
): string[] {
  return [...products]
    .sort((a, b) => (scores.get(b.productId) ?? 0) - (scores.get(a.productId) ?? 0))
    .slice(0, limit)
    .map((p) => p.productId);
}

export function buildHomepageSections(input: HomepageIntelligenceInput): HomepageSection[] {
  const pool = visibleProducts(input);
  const sections: HomepageSection[] = [];

  if (input.customer) {
    const matches = rankByCustomerMatch(pool, input.customer);
    sections.push({
      id: "recommended-for-you",
      title: "Recommended For You",
      description: "Personalized picks based on your activity",
      productIds: matches.slice(0, SECTION_LIMIT).map((m) => m.productId),
    });
  }

  sections.push({
    id: "trending",
    title: "Trending",
    description: "Jimvio trending products right now",
    productIds: topBy(pool, input.trendingScores, SECTION_LIMIT),
  });

  if (input.recentlyViewedIds.length > 0) {
    sections.push({
      id: "recently-viewed",
      title: "Recently Viewed",
      description: "Pick up where you left off",
      productIds: input.recentlyViewedIds.slice(0, SECTION_LIMIT),
    });
  }

  if (input.cartProductIds.length > 0) {
    sections.push({
      id: "continue-shopping",
      title: "Continue Shopping",
      description: "Items in your cart",
      productIds: input.cartProductIds.slice(0, SECTION_LIMIT),
    });
  }

  if (input.newProductIds.length > 0) {
    sections.push({
      id: "new-arrivals",
      title: "New Arrivals",
      description: "Fresh products just added",
      productIds: input.newProductIds.slice(0, SECTION_LIMIT),
    });
  }

  sections.push({
    id: "fast-shipping",
    title: "Fast Shipping",
    description: "Delivered in 7 days or less",
    productIds: pool
      .filter((p) => {
        const days = p.deliveryTime ? parseInt(p.deliveryTime, 10) : null;
        return days !== null && days <= 7;
      })
      .sort((a, b) => (input.rankScores.get(b.productId) ?? 0) - (input.rankScores.get(a.productId) ?? 0))
      .slice(0, SECTION_LIMIT)
      .map((p) => p.productId),
  });

  sections.push({
    id: "video-products",
    title: "Video Products",
    description: "Products with video demonstrations",
    productIds: pool
      .filter((p) => p.hasVideo)
      .sort((a, b) => (input.rankScores.get(b.productId) ?? 0) - (input.rankScores.get(a.productId) ?? 0))
      .slice(0, SECTION_LIMIT)
      .map((p) => p.productId),
  });

  sections.push({
    id: "high-quality",
    title: "High Quality",
    description: "Top Jimvio Quality scores",
    productIds: topBy(pool, input.qualityScores, SECTION_LIMIT),
  });

  if (input.communityPicks.length > 0) {
    sections.push({
      id: "community-picks",
      title: "Community Picks",
      description: "Loved by the Jimvio community",
      productIds: input.communityPicks.slice(0, SECTION_LIMIT),
    });
  }

  const affiliatePicks = rankAffiliatePicks(pool, input.trendingScores);
  if (affiliatePicks.length >= 3) {
    sections.push({
      id: "affiliate-picks",
      title: "Affiliate Picks",
      description: "Best commission and conversion products",
      productIds: affiliatePicks.slice(0, SECTION_LIMIT).map((p) => p.productId),
    });
  }

  return sections.filter((s) => s.productIds.length >= 3);
}
