import type {
  CJApiFilters,
  CJProduct,
  EnrichedProduct,
  ImportedMap,
  IntelligenceFilters,
} from "./types";
import {
  calculateProfitMetrics,
  calculateSupplierScore,
  calculateTrendScore,
  deliveryDays,
  getHealthLabel,
  getMarketFit,
  hasVariants,
  isStockStable,
} from "./product-utils";
import { calculateOpportunityScore } from "./opportunity-score";
import {
  classifyCatalogTier,
  computeCatalogBadges,
  computeConfidenceScore,
  computeQualityScores,
} from "./quality-engine";
import {
  buildTrendingContext,
  isTrendingProduct,
  passesQuickFilters,
  QUICK_FILTER_DEFAULTS,
  resolveThresholds,
  stripQuickFilters,
  type QuickFilterOptions,
} from "./quick-filter-intelligence";
import { filterBySmartSearch } from "./search";
import { productHasVideo } from "./product-utils";

const DEFAULT_MAX_DELIVERY_DAYS = 30;

export {
  activeQuickFilterKeys,
  computeFilterCounts,
  isQuickFilterActive,
  toggleQuickFilter,
  QUICK_FILTERS,
  type QuickFilterCounts,
  type QuickFilterKey,
} from "./quick-filter-intelligence";

export const DEFAULT_CJ_FILTERS: CJApiFilters = {
  keyWord: "",
  categoryId: "",
  minPrice: "",
  maxPrice: "",
  isFreeShipping: "",
  verifiedWarehouse: "",
  countryCode: "",
  deliveryTime: "",
  productFlag: "",
  hasVideo: "",
  sort: "desc",
  orderBy: "createAt",
  supplierId: "",
};

export const DEFAULT_INTELLIGENCE_FILTERS: IntelligenceFilters = {
  trending: false,
  bestSelling: false,
  mostFavorited: false,
  newArrivals: false,
  highProfitMargin: false,
  minProfitPercent: 0,
  minProfitAmount: 0,
  minRoi: 0,
  fastShipping: false,
  freeShipping: false,
  usWarehouse: false,
  euWarehouse: false,
  ukWarehouse: false,
  shipsWorldwide: false,
  maxDeliveryDays: 30,
  hasVideo: false,
  hasVariants: false,
  hasDescription: false,
  hasSpecifications: false,
  highQualityImages: false,
  minRating: 0,
  minReviewCount: 0,
  verifiedSupplier: false,
  topSupplier: false,
  fastResponseSupplier: false,
  highOrderSupplier: false,
  lowRefundSupplier: false,
  minHealthScore: 0,
  minOpportunityScore: 0,
  hideImported: false,
};

export function enrichProduct(
  p: CJProduct,
  importedMap: ImportedMap,
  trendingCtx?: ReturnType<typeof buildTrendingContext>
): EnrichedProduct {
  const imported = importedMap[p.pid];
  const profit = calculateProfitMetrics(p);
  const supplierScore = calculateSupplierScore(p);
  const placeholderScores = computeQualityScores(p);

  const base: EnrichedProduct = {
    ...p,
    intelligence: {
      healthScore: placeholderScores.healthScore,
      healthLabel: getHealthLabel(placeholderScores.healthScore),
      profit,
      isImported: Boolean(imported),
      importedProductId: imported?.productId,
      marketFit: getMarketFit(p),
      supplierScore,
      trending: false,
      hasVariants: hasVariants(p),
      stockStable: isStockStable(p),
      opportunityScore: 0,
      opportunityLevel: "skip",
      opportunityReasons: [],
      catalogTier: "PENDING",
      catalogBadges: [],
      qualityScores: placeholderScores,
      enrichmentStatus: p.intelligenceEnriched ? "complete" : "pending",
    },
  };

  if (trendingCtx) {
    base.intelligence.trending = isTrendingProduct(base, trendingCtx);
  } else {
    base.intelligence.trending =
      calculateTrendScore(p) >= QUICK_FILTER_DEFAULTS.trendingMinAbsoluteScore &&
      calculateTrendScore(p) > 0;
  }

  const opportunity = calculateOpportunityScore(base);
  base.intelligence.opportunityScore = opportunity.score;
  base.intelligence.opportunityLevel = opportunity.level;
  base.intelligence.opportunityReasons = opportunity.reasons;
  base.intelligence.aiRecommendation = opportunity.aiRecommendation;

  const qualityScores = computeQualityScores(base, opportunity.score, {
    enrichmentStatus: p.intelligenceEnriched ? "complete" : "pending",
  });
  base.intelligence.qualityScores = qualityScores;
  base.intelligence.healthScore = qualityScores.healthScore;
  base.intelligence.healthLabel = getHealthLabel(qualityScores.healthScore);
  base.intelligence.enrichmentStatus = p.intelligenceEnriched ? "complete" : "pending";
  base.intelligence.confidenceScore = computeConfidenceScore(
    base,
    p.intelligenceEnriched === true
  );
  base.intelligence.catalogTier = classifyCatalogTier(base, qualityScores, {
    enrichmentStatus: p.intelligenceEnriched ? "complete" : "pending",
  });
  base.intelligence.catalogBadges = computeCatalogBadges(base);

  return base;
}

export function enrichProductBatch(
  products: CJProduct[],
  importedMap: ImportedMap
): EnrichedProduct[] {
  const stubPool = products.map((p) => ({
    ...p,
    intelligence: {
      healthScore: 0,
      healthLabel: "poor" as const,
      profit: calculateProfitMetrics(p),
      isImported: false,
      marketFit: getMarketFit(p),
      supplierScore: calculateSupplierScore(p),
      trending: false,
      hasVariants: hasVariants(p),
      stockStable: isStockStable(p),
      opportunityScore: 0,
      opportunityLevel: "skip" as const,
      opportunityReasons: [],
      catalogTier: "PENDING" as const,
      catalogBadges: [],
      qualityScores: computeQualityScores(p, 0, { enrichmentStatus: "pending" }),
      enrichmentStatus: "pending" as const,
    },
  }));
  const trendingCtx = buildTrendingContext(stubPool);
  return products.map((p) => enrichProduct(p, importedMap, trendingCtx));
}

export function getQuickFilterCountPool(
  products: EnrichedProduct[],
  filters: IntelligenceFilters,
  localSearch: string,
  importedMap: ImportedMap
): EnrichedProduct[] {
  const sidebarOnly = stripQuickFilters(filters);
  let pool = applyIntelligenceFilters(products, sidebarOnly, { skipQuick: true });

  if (localSearch.trim()) {
    const matched = filterBySmartSearch(pool, localSearch);
    const stubs = matched.map((p) => enrichProduct(p, importedMap));
    const trendingCtx = buildTrendingContext(stubs);
    pool = matched.map((p) => enrichProduct(p, importedMap, trendingCtx));
  } else if (pool.length > 0) {
    const trendingCtx = buildTrendingContext(pool);
    pool = pool.map((p) => ({
      ...p,
      intelligence: {
        ...p.intelligence,
        trending: isTrendingProduct(p, trendingCtx),
      },
    }));
  }

  return pool;
}

export function applyIntelligenceFilters(
  products: EnrichedProduct[],
  filters: IntelligenceFilters,
  options?: QuickFilterOptions & { skipQuick?: boolean }
): EnrichedProduct[] {
  const thresholds = resolveThresholds(filters, options);
  const trendingCtx = buildTrendingContext(products, thresholds);

  return products.filter((p) => {
    const { intelligence: intel, listedNum } = p;

    if (filters.hideImported && intel.isImported) return false;

    if (filters.bestSelling && listedNum < 50) return false;
    if (filters.mostFavorited && listedNum < 200) return false;

    if (filters.minProfitPercent > 0 && intel.profit.marginPercent < filters.minProfitPercent)
      return false;
    if (filters.minProfitAmount > 0 && intel.profit.estimatedProfit < filters.minProfitAmount)
      return false;
    if (filters.minRoi > 0 && intel.profit.roi < filters.minRoi) return false;

    const days = deliveryDays(p);
    if (filters.freeShipping && !p.isFreeShipping && p.addMarkStatus !== 1)
      return false;
    if (filters.euWarehouse && !["DE", "FR", "EU"].includes(p.countryCode?.toUpperCase() ?? ""))
      return false;
    if (filters.ukWarehouse && p.countryCode?.toUpperCase() !== "GB") return false;
    if (filters.shipsWorldwide && p.countryCode && p.countryCode !== "CN") return false;

    const deliveryCapActive =
      filters.fastShipping ||
      filters.maxDeliveryDays < DEFAULT_MAX_DELIVERY_DAYS;
    if (deliveryCapActive && days !== null && days > filters.maxDeliveryDays)
      return false;

    if (filters.hasVideo && !productHasVideo(p)) return false;
    if (filters.hasVariants && !intel.hasVariants) return false;
    if (filters.hasDescription && !p.threeCategoryName) return false;
    if (filters.hasSpecifications && !p.categoryName) return false;
    if (filters.highQualityImages && !p.bigImage?.startsWith("http")) return false;

    if (
      filters.minRating > 0 &&
      filters.minRating < QUICK_FILTER_DEFAULTS.ratingMin &&
      (typeof p.rating !== "number" || p.rating < filters.minRating)
    )
      return false;

    if (filters.minReviewCount > 0) {
      const reviews = typeof p.reviewCount === "number" ? p.reviewCount : 0;
      if (reviews < filters.minReviewCount) return false;
    }

    if (filters.topSupplier && intel.supplierScore < 75) return false;
    if (filters.fastResponseSupplier && p.verifiedWarehouse !== 1) return false;
    if (filters.highOrderSupplier && listedNum < 100) return false;
    if (filters.lowRefundSupplier && intel.supplierScore < 70) return false;

    if (intel.healthScore < filters.minHealthScore) return false;

    if (!options?.skipQuick && !passesQuickFilters(p, filters, trendingCtx, thresholds))
      return false;

    return true;
  });
}

export function intelligenceFilterCount(filters: IntelligenceFilters): number {
  let count = 0;
  if (filters.trending) count++;
  if (filters.bestSelling) count++;
  if (filters.mostFavorited) count++;
  if (filters.newArrivals) count++;
  if (filters.highProfitMargin) count++;
  if (filters.minProfitPercent > 0) count++;
  if (filters.minProfitAmount > 0) count++;
  if (filters.minRoi > 0) count++;
  if (filters.fastShipping) count++;
  if (filters.freeShipping) count++;
  if (filters.usWarehouse) count++;
  if (filters.euWarehouse) count++;
  if (filters.ukWarehouse) count++;
  if (filters.shipsWorldwide) count++;
  if (filters.maxDeliveryDays < 30) count++;
  if (filters.hasVideo) count++;
  if (filters.hasVariants) count++;
  if (filters.hasDescription) count++;
  if (filters.hasSpecifications) count++;
  if (filters.highQualityImages) count++;
  if (filters.minRating > 0) count++;
  if (filters.minReviewCount > 0) count++;
  if (filters.verifiedSupplier) count++;
  if (filters.topSupplier) count++;
  if (filters.fastResponseSupplier) count++;
  if (filters.highOrderSupplier) count++;
  if (filters.lowRefundSupplier) count++;
  if (filters.minHealthScore > 0) count++;
  if (filters.minOpportunityScore > 0) count++;
  if (filters.hideImported) count++;
  return count;
}

export function trendingToApiFilters(
  intel: IntelligenceFilters,
  base: CJApiFilters
): CJApiFilters {
  const next = { ...base };
  if (intel.bestSelling) {
    next.orderBy = "listedNum";
    next.sort = "desc";
  } else if (intel.newArrivals) {
    next.orderBy = "createAt";
    next.sort = "desc";
  } else if (intel.mostFavorited) {
    next.orderBy = "listedNum";
    next.sort = "desc";
  }
  if (intel.trending) {
    next.productFlag = "1";
  }
  if (intel.hasVideo) {
    next.hasVideo = "1";
  }
  return next;
}
