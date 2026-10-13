export type TrendClassification =
  | "supplier_trending_flag"
  | "cj_order_count"
  | "recently_discovered"
  | "editorial"
  | "ordinary";

export type TrendInput = {
  supplierTrendingFlag?: boolean | null;
  cjOrderCount?: number | null;
  discoveredAt?: string | null;
  editorial?: boolean | null;
  nowMs?: number;
};

const RECENT_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * Labels demand evidence without treating a missing CJ trend flag as verified trending.
 * CJ order counts are supplier catalog activity, not Jimvio sales.
 */
export function classifyTrend(input: TrendInput): {
  classification: TrendClassification;
  evidence: string;
  verifiedTrending: boolean;
} {
  if (input.supplierTrendingFlag === true) {
    return {
      classification: "supplier_trending_flag",
      evidence: "cj_product_intelligence.trending",
      verifiedTrending: true,
    };
  }
  if (input.editorial === true) {
    return {
      classification: "editorial",
      evidence: "admin_editorial",
      verifiedTrending: false,
    };
  }
  const orders = Number(input.cjOrderCount ?? 0);
  if (Number.isFinite(orders) && orders > 0) {
    return {
      classification: "cj_order_count",
      evidence: "cj_product_intelligence.orders",
      verifiedTrending: false,
    };
  }
  if (input.discoveredAt) {
    const discovered = Date.parse(input.discoveredAt);
    const now = input.nowMs ?? Date.now();
    if (Number.isFinite(discovered) && now - discovered <= RECENT_MS) {
      return {
        classification: "recently_discovered",
        evidence: "catalog_discovered_at",
        verifiedTrending: false,
      };
    }
  }
  return {
    classification: "ordinary",
    evidence: "none",
    verifiedTrending: false,
  };
}
