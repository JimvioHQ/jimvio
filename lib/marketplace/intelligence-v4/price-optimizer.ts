/**
 * AI Price Optimizer v4 — recommendations only, never auto-changes prices.
 */

import type { MarketplaceProductSignals, PriceRecommendation } from "./types";

export function recommendPrice(
  signals: MarketplaceProductSignals,
  market?: {
    avgCategoryPrice?: number;
    competitorLow?: number;
    competitorHigh?: number;
    demandMultiplier?: number;
  }
): PriceRecommendation {
  const current = signals.price;
  const cost = signals.costPrice ?? current * 0.4;
  const shipping = 3;
  const minMargin = 1.25;
  const minPrice = Math.round((cost + shipping) * minMargin * 100) / 100;

  const demand = market?.demandMultiplier ?? 1;
  const conversionBoost = signals.saleCount > 50 ? 1.05 : signals.saleCount < 5 ? 0.95 : 1;

  let recommended = current;
  const reasoning: string[] = [];

  if (signals.compareAtPrice && signals.compareAtPrice > current) {
    reasoning.push("Compare-at price creates perceived value");
  }

  const views = Math.max(1, signals.viewCount);
  const conversion = signals.saleCount / views;

  if (conversion > 0.05 && signals.rating >= 4) {
    recommended = Math.round(current * 1.08 * 100) / 100;
    reasoning.push("High conversion + strong reviews — room to increase");
  } else if (conversion < 0.01 && views > 100) {
    recommended = Math.round(current * 0.92 * 100) / 100;
    reasoning.push("Low conversion despite traffic — consider lowering");
  } else {
    reasoning.push("Price is well-positioned for current demand");
  }

  recommended = Math.round(recommended * demand * conversionBoost * 100) / 100;
  recommended = Math.max(minPrice, recommended);

  if (market?.avgCategoryPrice) {
    const diff = (recommended - market.avgCategoryPrice) / market.avgCategoryPrice;
    if (diff > 0.2) {
      recommended = Math.round(market.avgCategoryPrice * 1.15 * 100) / 100;
      reasoning.push("Aligned with category average");
    }
  }

  const strategy: PriceRecommendation["strategy"] =
    recommended > current * 1.02 ? "increase"
    : recommended < current * 0.98 ? "decrease"
    : "maintain";

  return {
    currentPrice: current,
    recommendedPrice: recommended,
    minPrice,
    maxPrice: Math.round(current * 1.5 * 100) / 100,
    strategy,
    reasoning,
  };
}
