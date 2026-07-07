/**
 * AI Product Ranking v4 — composite marketplace rank 0-100.
 */

import type {
  MarketplaceProductSignals,
  MarketplaceRankResult,
  QualityLabel,
  RankFactors,
} from "./types";

function clamp(n: number, max = 100): number {
  return Math.max(0, Math.min(max, Math.round(n)));
}

function qualityLabel(score: number): QualityLabel {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Very Good";
  if (score >= 60) return "Good";
  if (score >= 40) return "Average";
  return "Poor";
}

function parseDeliveryDays(deliveryTime?: string | null): number | null {
  if (!deliveryTime) return null;
  const n = parseInt(deliveryTime, 10);
  return Number.isNaN(n) ? null : n;
}

export function computeRankFactors(signals: MarketplaceProductSignals): RankFactors {
  const views = Math.max(1, signals.viewCount);
  const conversion = signals.saleCount / views;
  const refundRate = signals.reviewCount > 0
    ? Math.max(0, 1 - signals.rating / 5) * 0.3
    : 0.05;

  const days = parseDeliveryDays(signals.deliveryTime);
  const fastShipping = days !== null && days <= 7 ? 100 : days !== null && days <= 14 ? 60 : 30;

  return {
    trending: clamp(Math.min(100, (signals.saleCount / 10) + (signals.viewCount / 100))),
    conversion: clamp(conversion * 500),
    clicks: clamp(Math.min(100, signals.viewCount / 50)),
    wishlist: clamp(Math.min(100, signals.wishlistCount * 5)),
    orders: clamp(Math.min(100, signals.saleCount * 2)),
    reviews: clamp(signals.rating * 20),
    refundRate: clamp(100 - refundRate * 200),
    supplierReputation: clamp(signals.supplierReputation ?? 50),
    fastShipping,
    video: signals.hasVideo ? 100 : 20,
    qualityConfidence:
      signals.qualityConfidence === "very_high" ? 100
      : signals.qualityConfidence === "high" ? 85
      : signals.qualityConfidence === "medium" ? 60
      : 35,
  };
}

const FACTOR_WEIGHTS: Record<keyof RankFactors, number> = {
  trending: 0.12,
  conversion: 0.14,
  clicks: 0.08,
  wishlist: 0.08,
  orders: 0.12,
  reviews: 0.08,
  refundRate: 0.1,
  supplierReputation: 0.1,
  fastShipping: 0.08,
  video: 0.05,
  qualityConfidence: 0.05,
};

export function computeMarketplaceRank(
  signals: MarketplaceProductSignals
): MarketplaceRankResult {
  const factors = computeRankFactors(signals);

  let rankScore = 0;
  for (const [key, weight] of Object.entries(FACTOR_WEIGHTS)) {
    rankScore += (factors[key as keyof RankFactors] ?? 0) * weight;
  }

  rankScore = clamp(rankScore);

  const qualityScore = clamp(
    factors.qualityConfidence * 0.3 +
    factors.reviews * 0.2 +
    factors.video * 0.15 +
    factors.supplierReputation * 0.2 +
    factors.refundRate * 0.15
  );

  const jimvioTrendingScore = clamp(
    factors.trending * 0.35 +
    factors.conversion * 0.25 +
    factors.wishlist * 0.2 +
    factors.clicks * 0.2
  );

  return {
    productId: signals.productId,
    rankScore,
    factors,
    qualityScore,
    qualityLabel: qualityLabel(qualityScore),
    jimvioTrendingScore,
  };
}

export function rankProductsByScore<T extends { id: string }>(
  products: T[],
  scores: Map<string, number>
): T[] {
  return [...products].sort((a, b) => {
    const sa = scores.get(a.id) ?? 0;
    const sb = scores.get(b.id) ?? 0;
    return sb - sa;
  });
}

export function assignMarketplaceRanks(
  results: MarketplaceRankResult[]
): MarketplaceRankResult[] {
  const sorted = [...results].sort((a, b) => b.rankScore - a.rankScore);
  return sorted.map((r, i) => ({
    ...r,
    marketplaceRank: i + 1,
  }));
}
