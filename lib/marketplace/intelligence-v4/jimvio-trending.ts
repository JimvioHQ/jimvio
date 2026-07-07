/**
 * Dynamic Jimvio Trending Engine v4 — independent of CJ trending.
 */

import type { MarketplaceProductSignals } from "./types";

export interface TrendingSignals {
  views: number;
  ctr: number;
  orders: number;
  favorites: number;
  wishlists: number;
  shares: number;
  affiliateSales: number;
  communityActivity: number;
  recentGrowth: number;
}

export function extractTrendingSignals(
  signals: MarketplaceProductSignals,
  extras?: Partial<TrendingSignals>
): TrendingSignals {
  const views = Math.max(1, signals.viewCount);
  const orders = signals.saleCount;
  const ctr = orders / views;

  return {
    views: signals.viewCount,
    ctr,
    orders,
    favorites: extras?.favorites ?? 0,
    wishlists: signals.wishlistCount,
    shares: extras?.shares ?? 0,
    affiliateSales: extras?.affiliateSales ?? 0,
    communityActivity: extras?.communityActivity ?? 0,
    recentGrowth: extras?.recentGrowth ?? Math.min(100, orders * 2),
  };
}

export function computeJimvioTrendingScore(
  trending: TrendingSignals
): number {
  const score =
    Math.min(25, trending.views / 40) +
    Math.min(20, trending.ctr * 400) +
    Math.min(20, trending.orders * 1.5) +
    Math.min(10, trending.wishlists * 2) +
    Math.min(8, trending.favorites * 3) +
    Math.min(7, trending.shares * 5) +
    Math.min(5, trending.affiliateSales * 2) +
    Math.min(3, trending.communityActivity) +
    Math.min(2, trending.recentGrowth / 10);

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function computeTrendingBatch(
  products: MarketplaceProductSignals[],
  extrasMap?: Map<string, Partial<TrendingSignals>>
): Map<string, number> {
  const scores = new Map<string, number>();
  for (const p of products) {
    const extras = extrasMap?.get(p.productId);
    const signals = extractTrendingSignals(p, extras);
    scores.set(p.productId, computeJimvioTrendingScore(signals));
  }
  return scores;
}
