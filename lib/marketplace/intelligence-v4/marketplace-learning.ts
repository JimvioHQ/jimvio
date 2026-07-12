/**
 * Marketplace Learning v4 — daily signal aggregation for ranking improvement.
 */

import type { MarketplaceProductSignals } from "./types";

export interface LearningSignals {
  clicks: number;
  views: number;
  orders: number;
  refunds: number;
  favorites: number;
  communityEngagement: number;
  affiliateSales: number;
  reviewScore: number;
}

export function extractLearningSignals(
  signals: MarketplaceProductSignals,
  extras?: Partial<LearningSignals>
): LearningSignals {
  const views = Math.max(1, signals.viewCount);
  return {
    clicks: extras?.clicks ?? signals.viewCount,
    views: signals.viewCount,
    orders: signals.saleCount,
    refunds: extras?.refunds ?? Math.round((1 - signals.rating / 5) * signals.reviewCount * 0.1),
    favorites: extras?.favorites ?? signals.wishlistCount,
    communityEngagement: extras?.communityEngagement ?? 0,
    affiliateSales: extras?.affiliateSales ?? 0,
    reviewScore: signals.rating,
  };
}

export function computeLearningBoost(learning: LearningSignals): number {
  const ctr = learning.orders / Math.max(1, learning.views);
  const refundPenalty = learning.orders > 0 ? learning.refunds / learning.orders : 0;

  let boost = 0;
  boost += Math.min(15, ctr * 300);
  boost += Math.min(10, learning.favorites * 0.5);
  boost += Math.min(8, learning.communityEngagement * 0.3);
  boost += Math.min(7, learning.affiliateSales * 0.4);
  boost += Math.min(10, learning.reviewScore * 2);
  boost -= Math.min(20, refundPenalty * 40);

  return Math.max(-20, Math.min(30, Math.round(boost)));
}

export function applyLearningToRank(
  baseRank: number,
  learning: LearningSignals
): number {
  const boost = computeLearningBoost(learning);
  return Math.max(0, Math.min(100, baseRank + boost));
}
