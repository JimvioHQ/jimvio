/**
 * AI Recommendations v4 — actionable suggestions (read-only).
 */

import type { AiRecommendation, MarketplaceProductSignals } from "./types";

export function generateProductRecommendations(
  signals: MarketplaceProductSignals
): Array<{ category: string; issue: string; recommendation: string; action: string; priority: number }> {
  const recs: Array<{
    category: string;
    issue: string;
    recommendation: string;
    action: string;
    priority: number;
  }> = [];

  if (!signals.hasVideo) {
    recs.push({
      category: "Media",
      issue: "Missing product video",
      recommendation: "Generate AI Video to increase conversion",
      action: "generate_ai_video",
      priority: 90,
    });
  }

  if ((signals.supplierReputation ?? 50) < 30) {
    recs.push({
      category: "Supplier",
      issue: "Low supplier reputation",
      recommendation: "Supplier should be blacklisted or replaced",
      action: "blacklist_supplier",
      priority: 95,
    });
  }

  const views = Math.max(1, signals.viewCount);
  const conversion = signals.saleCount / views;

  if (conversion < 0.01 && views > 50) {
    recs.push({
      category: "Pricing",
      issue: "Low conversion despite traffic",
      recommendation: "Consider lowering price to improve conversion",
      action: "lower_price",
      priority: 75,
    });
  } else if (conversion > 0.05 && signals.rating >= 4) {
    recs.push({
      category: "Pricing",
      issue: "High demand product",
      recommendation: "Consider increasing price — strong conversion",
      action: "increase_price",
      priority: 60,
    });
  }

  const days = signals.deliveryTime ? parseInt(signals.deliveryTime, 10) : null;
  if (days !== null && days > 14) {
    recs.push({
      category: "Shipping",
      issue: "Slow shipping",
      recommendation: "Reduce shipping time or switch warehouse",
      action: "reduce_shipping",
      priority: 80,
    });
  }

  if (signals.reviewCount < 3 && signals.saleCount > 10) {
    recs.push({
      category: "Content",
      issue: "Few reviews despite sales",
      recommendation: "Improve description and encourage reviews",
      action: "improve_description",
      priority: 55,
    });
  }

  return recs.sort((a, b) => b.priority - a.priority);
}

export function aggregateRecommendations(
  products: Array<{ signals: MarketplaceProductSignals; recs: ReturnType<typeof generateProductRecommendations> }>
): AiRecommendation[] {
  const buckets = new Map<string, { count: number; sample: string; action: string; priority: number }>();

  for (const { recs } of products) {
    for (const r of recs) {
      const key = `${r.category}:${r.issue}`;
      const existing = buckets.get(key);
      if (existing) {
        existing.count++;
      } else {
        buckets.set(key, {
          count: 1,
          sample: r.recommendation,
          action: r.action,
          priority: r.priority,
        });
      }
    }
  }

  return [...buckets.entries()]
    .map(([key, val]) => {
      const [category, issue] = key.split(":");
      return {
        category,
        issue,
        productCount: val.count,
        recommendation: val.sample,
        action: val.action,
        priority: val.priority,
      };
    })
    .sort((a, b) => b.priority - a.priority || b.productCount - a.productCount);
}
