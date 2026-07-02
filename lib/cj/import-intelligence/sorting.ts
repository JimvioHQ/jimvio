import type { EnrichedProduct } from "./types";
import { deliveryDays, productHasVideo } from "./product-utils";
import { calculateRiskScore } from "./opportunity-score";
import { hasCatalogVideo } from "./quick-filter-intelligence";

export type SortOption =
  | "default"
  | "closest-warehouse"
  | "fastest-shipping"
  | "highest-profit"
  | "highest-conversion"
  | "highest-opportunity"
  | "video-first"
  | "lowest-risk";

export const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: "default", label: "Default" },
  { value: "highest-opportunity", label: "Highest Opportunity" },
  { value: "highest-profit", label: "Highest Profit" },
  { value: "fastest-shipping", label: "Fastest Shipping" },
  { value: "video-first", label: "Video First" },
  { value: "lowest-risk", label: "Lowest Risk" },
  { value: "closest-warehouse", label: "Closest Warehouse" },
  { value: "highest-conversion", label: "Highest Conversion" },
];

const WAREHOUSE_PRIORITY: Record<string, number> = {
  US: 0,
  GB: 1,
  DE: 2,
  FR: 2,
  EU: 2,
  AU: 3,
  CN: 4,
};

function warehousePriority(code?: string): number {
  if (!code) return 5;
  return WAREHOUSE_PRIORITY[code.toUpperCase()] ?? 4;
}

function conversionScore(p: EnrichedProduct): number {
  const { intelligence: intel } = p;
  const days = deliveryDays(p) ?? 30;
  const shipFactor = Math.max(0, (30 - days) / 30);
  const popularity = Math.min(1, p.listedNum / 500);
  return (
    intel.healthScore * 0.35 +
    intel.profit.marginPercent * 0.3 +
    intel.supplierScore * 0.15 +
    shipFactor * 100 * 0.1 +
    popularity * 100 * 0.1
  );
}

export function sortProducts(
  products: EnrichedProduct[],
  sort: SortOption
): EnrichedProduct[] {
  if (sort === "default") return products;

  const sorted = [...products];
  switch (sort) {
    case "closest-warehouse":
      sorted.sort(
        (a, b) =>
          warehousePriority(a.countryCode) - warehousePriority(b.countryCode)
      );
      break;
    case "fastest-shipping":
      sorted.sort((a, b) => {
        const da = deliveryDays(a) ?? 99;
        const db = deliveryDays(b) ?? 99;
        return da - db;
      });
      break;
    case "highest-profit":
      sorted.sort(
        (a, b) =>
          b.intelligence.profit.estimatedProfit -
          a.intelligence.profit.estimatedProfit
      );
      break;
    case "highest-conversion":
      sorted.sort((a, b) => conversionScore(b) - conversionScore(a));
      break;
    case "highest-opportunity":
      sorted.sort(
        (a, b) =>
          b.intelligence.opportunityScore - a.intelligence.opportunityScore
      );
      break;
    case "video-first":
      sorted.sort((a, b) => {
        const av =
          hasCatalogVideo(a) || productHasVideo(a) ? 1 : 0;
        const bv =
          hasCatalogVideo(b) || productHasVideo(b) ? 1 : 0;
        if (bv !== av) return bv - av;
        return (
          b.intelligence.opportunityScore - a.intelligence.opportunityScore
        );
      });
      break;
    case "lowest-risk":
      sorted.sort((a, b) => calculateRiskScore(a) - calculateRiskScore(b));
      break;
  }
  return sorted;
}

export function computeSessionAnalytics(
  products: EnrichedProduct[],
  sessionImports: number,
  sessionPublished: number
) {
  const margins = products.map((p) => p.intelligence.profit.marginPercent);
  const profits = products.map((p) => p.intelligence.profit.estimatedProfit);
  const shipDays = products
    .map((p) => deliveryDays(p))
    .filter((d): d is number => d !== null);

  const avg = (arr: number[]) =>
    arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  return {
    todaysImports: sessionImports,
    publishedProducts: sessionPublished,
    draftProducts: Math.max(0, sessionImports - sessionPublished),
    averageMargin: Math.round(avg(margins)),
    averageShippingDays: Math.round(avg(shipDays) * 10) / 10,
    averageProfit: Math.round(avg(profits) * 100) / 100,
  };
}
