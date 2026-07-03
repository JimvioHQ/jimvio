import type { IntelligenceFilters } from "./types";
import { QUICK_FILTER_DEFAULTS } from "./quick-filter-intelligence";

const DEFAULT_MAX_DELIVERY = 30;

export function describeActiveFilters(filters: IntelligenceFilters): string[] {
  const active: string[] = [];

  if (filters.trending) active.push("trending");
  if (filters.bestSelling) active.push("bestSelling");
  if (filters.mostFavorited) active.push("mostFavorited");
  if (filters.newArrivals) active.push("newArrivals");
  if (filters.highProfitMargin) active.push("highProfitMargin");
  if (filters.minProfitPercent > 0) active.push(`minProfitPercent=${filters.minProfitPercent}`);
  if (filters.minProfitAmount > 0) active.push(`minProfitAmount=${filters.minProfitAmount}`);
  if (filters.minRoi > 0) active.push(`minRoi=${filters.minRoi}`);
  if (filters.fastShipping) active.push("fastShipping");
  if (filters.freeShipping) active.push("freeShipping");
  if (filters.usWarehouse) active.push("usWarehouse");
  if (filters.euWarehouse) active.push("euWarehouse");
  if (filters.ukWarehouse) active.push("ukWarehouse");
  if (filters.shipsWorldwide) active.push("shipsWorldwide");
  if (filters.maxDeliveryDays < DEFAULT_MAX_DELIVERY) {
    active.push(`maxDeliveryDays=${filters.maxDeliveryDays}`);
  }
  if (filters.hasVideo) active.push("hasVideo");
  if (filters.hasVariants) active.push("hasVariants");
  if (filters.hasDescription) active.push("hasDescription");
  if (filters.hasSpecifications) active.push("hasSpecifications");
  if (filters.highQualityImages) active.push("highQualityImages");
  if (filters.minRating > 0) active.push(`minRating=${filters.minRating}`);
  if (filters.minRating >= QUICK_FILTER_DEFAULTS.ratingMin) active.push("rating45");
  if (filters.minReviewCount > 0) active.push(`minReviewCount=${filters.minReviewCount}`);
  if (filters.verifiedSupplier) active.push("verifiedSupplier");
  if (filters.topSupplier) active.push("topSupplier");
  if (filters.fastResponseSupplier) active.push("fastResponseSupplier");
  if (filters.highOrderSupplier) active.push("highOrderSupplier");
  if (filters.lowRefundSupplier) active.push("lowRefundSupplier");
  if (filters.minHealthScore > 0) active.push(`minHealthScore=${filters.minHealthScore}`);
  if (filters.minOpportunityScore > 0) {
    active.push(`minOpportunityScore=${filters.minOpportunityScore}`);
  }
  if (filters.hideImported) active.push("hideImported");

  return active;
}

export function logFilterDebug(
  context: string,
  filters: IntelligenceFilters,
  stats: {
    loaded: number;
    visible: number;
    poolSize?: number;
  }
): void {
  const active = describeActiveFilters(filters);
  console.debug(`[CJ Import Filters] ${context}`, {
    activeFilters: active,
    activeCount: active.length,
    loadedProducts: stats.loaded,
    visibleProducts: stats.visible,
    countPoolSize: stats.poolSize,
  });
}
