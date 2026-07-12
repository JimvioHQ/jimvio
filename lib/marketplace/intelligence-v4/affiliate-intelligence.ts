/**
 * Affiliate Intelligence v4 — best affiliate product picks.
 */

import type { AffiliatePick, MarketplaceProductSignals } from "./types";

export function computeAffiliateScore(signals: MarketplaceProductSignals): number {
  const commission = signals.affiliateCommissionRate ?? 0;
  const views = Math.max(1, signals.viewCount);
  const conversion = signals.saleCount / views;

  let score = commission * 3;
  score += Math.min(30, conversion * 500);
  score += signals.hasVideo ? 15 : 0;
  score += Math.min(20, signals.saleCount);
  score += signals.rating >= 4 ? 10 : 0;

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function rankAffiliatePicks(
  products: MarketplaceProductSignals[],
  trendingScores: Map<string, number>
): AffiliatePick[] {
  return products
    .filter((p) => (p.affiliateCommissionRate ?? 0) > 0)
    .map((p) => {
      const views = Math.max(1, p.viewCount);
      return {
        productId: p.productId,
        name: p.name,
        affiliateScore: computeAffiliateScore(p),
        conversionRate: Math.round((p.saleCount / views) * 10000) / 10000,
        commissionRate: p.affiliateCommissionRate ?? 0,
        hasVideo: p.hasVideo,
        trendingScore: trendingScores.get(p.productId) ?? 0,
      };
    })
    .sort((a, b) => b.affiliateScore - a.affiliateScore);
}
