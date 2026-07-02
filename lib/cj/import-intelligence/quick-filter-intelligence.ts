/**
 * Quick-filter intelligence — shared predicates and counters.
 */

import type { CJProduct, EnrichedProduct, IntelligenceFilters } from "./types";
import {
  calculateProfitMetrics,
  calculateSupplierScore,
  calculateTrendScore,
  deliveryDays,
  productHasVideo,
} from "./product-utils";

export interface QuickFilterThresholds {
  highProfitMarginPercent: number;
  highProfitMinUsd: number;
  fastShippingMaxDays: number;
  ratingMin: number;
  verifiedSupplierScoreMin: number;
  trendingMinAbsoluteScore: number;
  trendingTopPercentile: number;
}

export const QUICK_FILTER_DEFAULTS: QuickFilterThresholds = {
  highProfitMarginPercent: 30,
  highProfitMinUsd: 5,
  fastShippingMaxDays: 7,
  ratingMin: 4.5,
  verifiedSupplierScoreMin: 75,
  trendingMinAbsoluteScore: 40,
  trendingTopPercentile: 0.25,
};

export interface TrendingContext {
  threshold: number;
  scores: Map<string, number>;
}

export function buildTrendingContext(
  products: EnrichedProduct[],
  thresholds: QuickFilterThresholds = QUICK_FILTER_DEFAULTS
): TrendingContext {
  const scores = new Map<string, number>();
  const values: number[] = [];

  for (const p of products) {
    const score = calculateTrendScore(p);
    scores.set(p.pid, score);
    if (score > 0) values.push(score);
  }

  let threshold = thresholds.trendingMinAbsoluteScore;
  if (values.length > 0) {
    const sorted = [...values].sort((a, b) => b - a);
    const topCount = Math.max(1, Math.ceil(sorted.length * thresholds.trendingTopPercentile));
    const percentileFloor = sorted[topCount - 1] ?? 0;
    threshold = Math.max(threshold, percentileFloor);
  }

  return { threshold, scores };
}

export function isTrendingProduct(
  p: EnrichedProduct,
  ctx: TrendingContext
): boolean {
  const score = ctx.scores.get(p.pid) ?? calculateTrendScore(p);
  return score >= ctx.threshold && score > 0;
}

export function hasCatalogVideo(p: CJProduct): boolean {
  if (productHasVideo(p)) return true;
  if (typeof p.videoUrl === "string" && p.videoUrl.trim().length > 0) return true;
  if ((p.videoCount ?? 0) > 0) return true;
  return false;
}

export function isHighProfit(
  p: EnrichedProduct,
  thresholds: QuickFilterThresholds = QUICK_FILTER_DEFAULTS
): boolean {
  const profit = p.intelligence?.profit ?? calculateProfitMetrics(p);
  return (
    profit.marginPercent >= thresholds.highProfitMarginPercent ||
    profit.estimatedProfit >= thresholds.highProfitMinUsd
  );
}

export function isFastShipping(
  p: CJProduct,
  thresholds: QuickFilterThresholds = QUICK_FILTER_DEFAULTS
): boolean {
  const days = deliveryDays(p);
  return days !== null && days <= thresholds.fastShippingMaxDays;
}

const US_WAREHOUSE_CODES = new Set(["US", "USA"]);
const US_WAREHOUSE_NAMES = ["united states", "usa", "u.s.", "u.s.a."];

export function isUsWarehouse(p: CJProduct): boolean {
  const code = (p.countryCode ?? "").trim().toUpperCase();
  if (US_WAREHOUSE_CODES.has(code)) return true;

  const warehouse = (p.warehouseName ?? "").trim().toLowerCase();
  if (warehouse && US_WAREHOUSE_NAMES.some((n) => warehouse.includes(n))) return true;

  return false;
}

export function hasRating45(
  p: CJProduct,
  thresholds: QuickFilterThresholds = QUICK_FILTER_DEFAULTS
): boolean {
  if (typeof p.rating !== "number" || Number.isNaN(p.rating)) return false;
  return p.rating >= thresholds.ratingMin;
}

export function isVerifiedSupplier(
  p: EnrichedProduct,
  thresholds: QuickFilterThresholds = QUICK_FILTER_DEFAULTS
): boolean {
  if (p.verifiedWarehouse === 1) return true;
  if (p.supplierVerified === true) return true;
  const score = p.intelligence?.supplierScore ?? calculateSupplierScore(p);
  return score >= thresholds.verifiedSupplierScoreMin;
}

export function meetsOpportunityThreshold(
  p: EnrichedProduct,
  minScore: number
): boolean {
  return (p.intelligence?.opportunityScore ?? 0) >= minScore;
}

export function stripQuickFilters(
  filters: IntelligenceFilters
): IntelligenceFilters {
  return {
    ...filters,
    trending: false,
    hasVideo: false,
    highProfitMargin: false,
    fastShipping: false,
    usWarehouse: false,
    verifiedSupplier: false,
    minRating:
      filters.minRating >= QUICK_FILTER_DEFAULTS.ratingMin ? 0 : filters.minRating,
    minOpportunityScore: 0,
  };
}

export interface QuickFilterOptions {
  thresholds?: Partial<QuickFilterThresholds>;
  profitThresholdUsd?: number;
}

export function resolveThresholds(
  filters: IntelligenceFilters,
  options?: QuickFilterOptions
): QuickFilterThresholds {
  const base = { ...QUICK_FILTER_DEFAULTS, ...options?.thresholds };
  if (filters.minProfitAmount > 0) {
    return { ...base, highProfitMinUsd: filters.minProfitAmount };
  }
  if (options?.profitThresholdUsd && options.profitThresholdUsd > 0) {
    return { ...base, highProfitMinUsd: options.profitThresholdUsd };
  }
  return base;
}

export type QuickFilterKey =
  | "trending"
  | "hasVideo"
  | "highProfit"
  | "fastShipping"
  | "usWarehouse"
  | "rating45"
  | "verifiedSupplier"
  | "opportunity90"
  | "opportunity80"
  | "opportunity70";

export const OPPORTUNITY_QUICK_THRESHOLDS = {
  opportunity90: 90,
  opportunity80: 80,
  opportunity70: 70,
} as const;

export interface QuickFilterCounts {
  trending: number;
  hasVideo: number;
  highProfit: number;
  fastShipping: number;
  usWarehouse: number;
  rating45: number;
  verifiedSupplier: number;
  opportunity90: number;
  opportunity80: number;
  opportunity70: number;
  poolSize: number;
}

export function matchesQuickFilter(
  key: QuickFilterKey,
  p: EnrichedProduct,
  trendingCtx: TrendingContext,
  thresholds: QuickFilterThresholds
): boolean {
  switch (key) {
    case "trending":
      return isTrendingProduct(p, trendingCtx);
    case "hasVideo":
      return hasCatalogVideo(p);
    case "highProfit":
      return isHighProfit(p, thresholds);
    case "fastShipping":
      return isFastShipping(p, thresholds);
    case "usWarehouse":
      return isUsWarehouse(p);
    case "rating45":
      return hasRating45(p, thresholds);
    case "verifiedSupplier":
      return isVerifiedSupplier(p, thresholds);
    case "opportunity90":
      return meetsOpportunityThreshold(p, OPPORTUNITY_QUICK_THRESHOLDS.opportunity90);
    case "opportunity80":
      return meetsOpportunityThreshold(p, OPPORTUNITY_QUICK_THRESHOLDS.opportunity80);
    case "opportunity70":
      return meetsOpportunityThreshold(p, OPPORTUNITY_QUICK_THRESHOLDS.opportunity70);
    default:
      return false;
  }
}

export function computeFilterCounts(
  pool: EnrichedProduct[],
  filters: IntelligenceFilters = {} as IntelligenceFilters,
  options?: QuickFilterOptions
): QuickFilterCounts {
  const thresholds = resolveThresholds(filters, options);
  const trendingCtx = buildTrendingContext(pool, thresholds);

  let trending = 0;
  let hasVideo = 0;
  let highProfit = 0;
  let fastShipping = 0;
  let usWarehouse = 0;
  let rating45 = 0;
  let verifiedSupplier = 0;
  let opportunity90 = 0;
  let opportunity80 = 0;
  let opportunity70 = 0;

  for (const p of pool) {
    if (matchesQuickFilter("trending", p, trendingCtx, thresholds)) trending++;
    if (matchesQuickFilter("hasVideo", p, trendingCtx, thresholds)) hasVideo++;
    if (matchesQuickFilter("highProfit", p, trendingCtx, thresholds)) highProfit++;
    if (matchesQuickFilter("fastShipping", p, trendingCtx, thresholds)) fastShipping++;
    if (matchesQuickFilter("usWarehouse", p, trendingCtx, thresholds)) usWarehouse++;
    if (matchesQuickFilter("rating45", p, trendingCtx, thresholds)) rating45++;
    if (matchesQuickFilter("verifiedSupplier", p, trendingCtx, thresholds)) verifiedSupplier++;
    if (matchesQuickFilter("opportunity90", p, trendingCtx, thresholds)) opportunity90++;
    if (matchesQuickFilter("opportunity80", p, trendingCtx, thresholds)) opportunity80++;
    if (matchesQuickFilter("opportunity70", p, trendingCtx, thresholds)) opportunity70++;
  }

  return {
    trending,
    hasVideo,
    highProfit,
    fastShipping,
    usWarehouse,
    rating45,
    verifiedSupplier,
    opportunity90,
    opportunity80,
    opportunity70,
    poolSize: pool.length,
  };
}

export const QUICK_FILTERS: Array<{
  key: QuickFilterKey;
  label: string;
  emoji: string;
}> = [
  { key: "trending", label: "Trending", emoji: "🔥" },
  { key: "hasVideo", label: "Has Video", emoji: "🎥" },
  { key: "highProfit", label: "High Profit", emoji: "💰" },
  { key: "fastShipping", label: "Fast Shipping", emoji: "🚚" },
  { key: "usWarehouse", label: "US Warehouse", emoji: "🇺🇸" },
  { key: "rating45", label: "4.5+", emoji: "⭐" },
  { key: "verifiedSupplier", label: "Verified Supplier", emoji: "🏆" },
  { key: "opportunity90", label: "Opportunity 90+", emoji: "🚀" },
  { key: "opportunity80", label: "Opportunity 80+", emoji: "🔥" },
  { key: "opportunity70", label: "Opportunity 70+", emoji: "✅" },
];

export function activeQuickFilterKeys(
  filters: IntelligenceFilters
): Set<QuickFilterKey> {
  const keys: QuickFilterKey[] = [
    "trending",
    "hasVideo",
    "highProfit",
    "fastShipping",
    "usWarehouse",
    "rating45",
    "verifiedSupplier",
    "opportunity90",
    "opportunity80",
    "opportunity70",
  ];
  return new Set(keys.filter((k) => isQuickFilterActive(k, filters)));
}

export function isQuickFilterActive(
  key: QuickFilterKey,
  filters: IntelligenceFilters
): boolean {
  switch (key) {
    case "trending":
      return filters.trending;
    case "hasVideo":
      return filters.hasVideo;
    case "highProfit":
      return filters.highProfitMargin;
    case "fastShipping":
      return filters.fastShipping;
    case "usWarehouse":
      return filters.usWarehouse;
    case "rating45":
      return filters.minRating >= QUICK_FILTER_DEFAULTS.ratingMin;
    case "verifiedSupplier":
      return filters.verifiedSupplier;
    case "opportunity90":
      return filters.minOpportunityScore === OPPORTUNITY_QUICK_THRESHOLDS.opportunity90;
    case "opportunity80":
      return filters.minOpportunityScore === OPPORTUNITY_QUICK_THRESHOLDS.opportunity80;
    case "opportunity70":
      return filters.minOpportunityScore === OPPORTUNITY_QUICK_THRESHOLDS.opportunity70;
    default:
      return false;
  }
}

export function toggleQuickFilter(
  key: QuickFilterKey,
  filters: IntelligenceFilters
): IntelligenceFilters {
  const next = { ...filters };
  switch (key) {
    case "trending":
      next.trending = !filters.trending;
      break;
    case "hasVideo":
      next.hasVideo = !filters.hasVideo;
      break;
    case "highProfit":
      next.highProfitMargin = !filters.highProfitMargin;
      break;
    case "fastShipping":
      next.fastShipping = !filters.fastShipping;
      break;
    case "usWarehouse":
      next.usWarehouse = !filters.usWarehouse;
      break;
    case "rating45":
      next.minRating =
        filters.minRating >= QUICK_FILTER_DEFAULTS.ratingMin
          ? 0
          : QUICK_FILTER_DEFAULTS.ratingMin;
      break;
    case "verifiedSupplier":
      next.verifiedSupplier = !filters.verifiedSupplier;
      break;
    case "opportunity90": {
      const threshold = OPPORTUNITY_QUICK_THRESHOLDS.opportunity90;
      next.minOpportunityScore =
        filters.minOpportunityScore === threshold ? 0 : threshold;
      break;
    }
    case "opportunity80": {
      const threshold = OPPORTUNITY_QUICK_THRESHOLDS.opportunity80;
      next.minOpportunityScore =
        filters.minOpportunityScore === threshold ? 0 : threshold;
      break;
    }
    case "opportunity70": {
      const threshold = OPPORTUNITY_QUICK_THRESHOLDS.opportunity70;
      next.minOpportunityScore =
        filters.minOpportunityScore === threshold ? 0 : threshold;
      break;
    }
  }
  return next;
}

export function passesQuickFilters(
  p: EnrichedProduct,
  filters: IntelligenceFilters,
  trendingCtx: TrendingContext,
  thresholds: QuickFilterThresholds
): boolean {
  if (filters.trending && !isTrendingProduct(p, trendingCtx)) return false;
  if (filters.hasVideo && !hasCatalogVideo(p)) return false;
  if (filters.highProfitMargin && !isHighProfit(p, thresholds)) return false;
  if (filters.fastShipping && !isFastShipping(p, thresholds)) return false;
  if (filters.usWarehouse && !isUsWarehouse(p)) return false;
  if (
    filters.minRating >= QUICK_FILTER_DEFAULTS.ratingMin &&
    !hasRating45(p, thresholds)
  )
    return false;
  if (filters.verifiedSupplier && !isVerifiedSupplier(p, thresholds)) return false;
  if (
    filters.minOpportunityScore > 0 &&
    !meetsOpportunityThreshold(p, filters.minOpportunityScore)
  )
    return false;
  return true;
}
