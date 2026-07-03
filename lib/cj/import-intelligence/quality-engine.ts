/**
 * Jimvio Premium Intelligence — quality scoring & tier classification.
 * Missing data yields neutral scores; never auto-hide for missing fields alone.
 */

import type { CJProduct, CatalogBadge, CatalogTier, EnrichedProduct, QualityScoreBreakdown } from "../import-intelligence/types";
import {
  calculateProfitMetrics,
  calculateSupplierScore,
  calculateTrendScore,
  deliveryDays,
  getReviewCount,
  productHasVideo,
} from "../import-intelligence/product-utils";
import { isVerifiedSupplier } from "../import-intelligence/quick-filter-intelligence";

export type { CatalogBadge, CatalogTier, QualityScoreBreakdown };
export type EnrichmentStatus = "pending" | "processing" | "complete" | "failed";

const NEUTRAL = 55;
const WEIGHTS = {
  video: 1,
  supplier: 1,
  shipping: 1,
  profit: 1,
  trend: 1,
  stock: 1,
  review: 1,
  image: 1,
  description: 1,
  opportunity: 1,
} as const;

export interface ScoringContext {
  enrichmentStatus?: EnrichmentStatus;
  /** 0-100 — lower when key fields are missing */
  confidenceScore?: number;
}

export function getImageCount(p: CJProduct): number {
  if (typeof p.imageCount === "number" && p.imageCount > 0) return p.imageCount;
  return p.bigImage?.startsWith("http") ? 1 : 0;
}

export function getDescriptionLength(p: CJProduct): number {
  if (typeof p.descriptionLength === "number" && p.descriptionLength > 0) {
    return p.descriptionLength;
  }
  const parts = [p.threeCategoryName, p.categoryName].filter(Boolean);
  return parts.join(" ").trim().length;
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function scoreVideo(p: CJProduct): number {
  if (productHasVideo(p)) return 100;
  if (Number(p.isVideo) === 0) return 25;
  return NEUTRAL;
}

function scoreShipping(p: CJProduct): number {
  const days = deliveryDays(p);
  if (days === null) return NEUTRAL;
  if (p.isFreeShipping || p.addMarkStatus === 1) return clamp(85 - days * 2);
  if (days <= 3) return 100;
  if (days <= 7) return 90;
  if (days <= 10) return 75;
  if (days <= 15) return 55;
  return 35;
}

function scoreProfit(marginPercent: number): number {
  if (marginPercent < 0) return 15;
  if (marginPercent >= 50) return 100;
  if (marginPercent >= 35) return 90;
  if (marginPercent >= 25) return 82;
  if (marginPercent >= 15) return 70;
  if (marginPercent >= 10) return 58;
  if (marginPercent > 0) return 45;
  return 25;
}

function scoreTrend(p: CJProduct): number {
  const raw = calculateTrendScore(p);
  if (raw >= 500) return 100;
  if (raw >= 200) return 85;
  if (raw >= 100) return 70;
  if (raw >= 50) return 55;
  if (raw > 0) return 40;
  return NEUTRAL;
}

function scoreStock(p: CJProduct): number {
  const stock = p.warehouseInventoryNum ?? 0;
  if (stock >= 500) return 100;
  if (stock >= 100) return 85;
  if (stock >= 50) return 70;
  if (stock >= 20) return 58;
  if (stock > 0) return 48;
  return 10;
}

function scoreReviews(p: CJProduct): number {
  const rating = typeof p.rating === "number" ? p.rating : null;
  const reviews = getReviewCount(p);
  if (rating === null && reviews === 0) return NEUTRAL;
  const ratingPart = rating !== null ? (rating / 5) * 75 : NEUTRAL * 0.5;
  const reviewPart = Math.min(25, reviews * 0.4);
  return clamp(ratingPart + reviewPart);
}

function scoreImages(p: CJProduct, enriched: boolean): number {
  const count = getImageCount(p);
  if (count >= 8) return 100;
  if (count >= 5) return 90;
  if (count >= 4) return 78;
  if (count >= 3) return 65;
  if (count >= 1) return enriched ? 45 : NEUTRAL;
  return enriched ? 20 : NEUTRAL;
}

function scoreDescription(p: CJProduct, enriched: boolean): number {
  const len = getDescriptionLength(p);
  if (len === 0) return enriched ? 25 : NEUTRAL;
  if (len >= 800) return 100;
  if (len >= 500) return 90;
  if (len >= 300) return 75;
  if (len >= 150) return 55;
  return 38;
}

export function computeConfidenceScore(p: CJProduct, enriched: boolean): number {
  let score = 40;
  if (enriched) score += 25;
  if (typeof p.rating === "number") score += 10;
  if (deliveryDays(p) !== null) score += 10;
  if (getImageCount(p) > 1) score += 8;
  if (getDescriptionLength(p) >= 100) score += 7;
  if (productHasVideo(p)) score += 5;
  return clamp(score);
}

export function computeQualityScores(
  p: CJProduct,
  opportunityScore = 0,
  ctx: ScoringContext = {}
): QualityScoreBreakdown {
  const enriched = ctx.enrichmentStatus === "complete" || p.intelligenceEnriched === true;
  const marginPercent =
    "intelligence" in p && p.intelligence
      ? (p as EnrichedProduct).intelligence.profit.marginPercent
      : calculateProfitMetrics(p).marginPercent;

  const partial = {
    videoScore: scoreVideo(p),
    supplierScore: calculateSupplierScore(p),
    shippingScore: scoreShipping(p),
    profitScore: scoreProfit(marginPercent),
    trendScore: scoreTrend(p),
    stockScore: scoreStock(p),
    reviewScore: scoreReviews(p),
    imageQualityScore: scoreImages(p, enriched),
    descriptionQualityScore: scoreDescription(p, enriched),
    opportunityScore: clamp(opportunityScore),
  };

  const totalWeight = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
  const healthScore = clamp(
    Object.entries(WEIGHTS).reduce((sum, [key, w]) => {
      const field = key === "image" ? "imageQualityScore" : key === "description" ? "descriptionQualityScore" : `${key}Score`;
      return sum + (partial[field as keyof typeof partial] as number) * w;
    }, 0) / totalWeight
  );

  return { ...partial, healthScore };
}

export function classifyCatalogTier(
  p: EnrichedProduct,
  scores: QualityScoreBreakdown,
  ctx: ScoringContext = {}
): CatalogTier {
  const enrichmentStatus = ctx.enrichmentStatus ?? "pending";
  if (enrichmentStatus !== "complete") return "PENDING";

  const margin = p.intelligence.profit.marginPercent;
  const stock = p.warehouseInventoryNum ?? 0;
  const health = scores.healthScore;
  const verified = isVerifiedSupplier(p);
  const hasVideo = productHasVideo(p);

  if (stock <= 0 || margin < 0 || health < 40) return "HIDDEN";

  const eliteCore =
    hasVideo && verified && margin >= 25 && stock > 0 && health >= 90;
  if (eliteCore) return "ELITE";

  const premiumCore =
    verified && margin >= 15 && stock > 0 && health >= 80;
  if (premiumCore) return "PREMIUM";

  if (stock > 0 && margin > 0 && health >= 60) return "STANDARD";

  return "HIDDEN";
}

export function computeCatalogBadges(p: EnrichedProduct): CatalogBadge[] {
  const badges: CatalogBadge[] = [];
  const tier = p.intelligence.catalogTier;
  const margin = p.intelligence.profit.marginPercent;
  const days = deliveryDays(p);
  const code = (p.countryCode ?? "").toUpperCase();

  if (productHasVideo(p)) badges.push({ id: "video", emoji: "🎥", label: "Video" });
  if (p.intelligence.trending) badges.push({ id: "trending", emoji: "🔥", label: "Trending" });
  if (isVerifiedSupplier(p)) badges.push({ id: "verified", emoji: "✅", label: "Verified" });
  if (tier === "ELITE") badges.push({ id: "elite", emoji: "🏆", label: "Elite" });
  if (tier === "PREMIUM") badges.push({ id: "premium", emoji: "⭐", label: "Premium" });
  if ((p.warehouseInventoryNum ?? 0) > 0) badges.push({ id: "in-stock", emoji: "📦", label: "In Stock" });
  if (days !== null && days <= 7) badges.push({ id: "fast-shipping", emoji: "🚚", label: "Fast Shipping" });
  if (margin >= 25) badges.push({ id: "high-profit", emoji: "💰", label: "High Profit" });
  if (code === "US") badges.push({ id: "us-warehouse", emoji: "🇺🇸", label: "US Warehouse" });
  if (["DE", "FR", "EU"].includes(code)) badges.push({ id: "eu-warehouse", emoji: "🇪🇺", label: "EU Warehouse" });
  if (code === "GB") badges.push({ id: "uk-warehouse", emoji: "🇬🇧", label: "UK Warehouse" });

  return badges;
}

const TIER_RANK: Record<CatalogTier, number> = {
  ELITE: 0,
  PREMIUM: 1,
  STANDARD: 2,
  PENDING: 3,
  HIDDEN: 4,
};

function sortKey(p: EnrichedProduct): number {
  const tier = p.intelligence.catalogTier;
  const hasVideo = productHasVideo(p);
  const trending = p.intelligence.trending;
  if (tier === "ELITE" && hasVideo) return 0;
  if (tier === "ELITE" && trending) return 1;
  if (tier === "ELITE") return 2;
  if (tier === "PREMIUM" && hasVideo) return 3;
  if (tier === "PREMIUM" && trending) return 4;
  if (tier === "PREMIUM") return 5;
  if (tier === "STANDARD") return 6;
  if (tier === "PENDING") return 7;
  return 8 + TIER_RANK[tier];
}

export function sortPremiumCatalog(products: EnrichedProduct[]): EnrichedProduct[] {
  return [...products].sort((a, b) => {
    const kd = sortKey(a) - sortKey(b);
    if (kd !== 0) return kd;
    const h =
      (b.intelligence.qualityScores?.healthScore ?? b.intelligence.healthScore) -
      (a.intelligence.qualityScores?.healthScore ?? a.intelligence.healthScore);
    if (h !== 0) return h;
    return b.intelligence.opportunityScore - a.intelligence.opportunityScore;
  });
}

export type AdminTierFilter = CatalogTier | "curated";

export function filterPremiumCatalog(
  products: EnrichedProduct[],
  options: {
    showHidden?: boolean;
    showPending?: boolean;
    showStandard?: boolean;
    tiers?: CatalogTier[];
  } = {}
): EnrichedProduct[] {
  if (options.tiers?.length) {
    const set = new Set(options.tiers);
    return products.filter((p) => set.has(p.intelligence.catalogTier));
  }

  return products.filter((p) => {
    const tier = p.intelligence.catalogTier;
    if (tier === "HIDDEN") return options.showHidden === true;
    if (tier === "PENDING") return options.showPending !== false;
    if (tier === "STANDARD") return options.showStandard === true;
    return tier === "ELITE" || tier === "PREMIUM";
  });
}

/** Customer marketplace: Elite + Premium only */
export function isCustomerVisibleTier(tier: CatalogTier): boolean {
  return tier === "ELITE" || tier === "PREMIUM";
}

export interface CatalogTierCounts {
  elite: number;
  premium: number;
  standard: number;
  pending: number;
  hidden: number;
  curated: number;
  total: number;
}

export function countCatalogTiers(products: EnrichedProduct[]): CatalogTierCounts {
  const counts = { elite: 0, premium: 0, standard: 0, pending: 0, hidden: 0 };
  for (const p of products) {
    switch (p.intelligence.catalogTier) {
      case "ELITE": counts.elite++; break;
      case "PREMIUM": counts.premium++; break;
      case "STANDARD": counts.standard++; break;
      case "PENDING": counts.pending++; break;
      default: counts.hidden++;
    }
  }
  return {
    ...counts,
    curated: counts.elite + counts.premium,
    total: products.length,
  };
}

export const CATALOG_TIER_STYLES: Record<
  CatalogTier,
  { label: string; emoji: string; color: string; bg: string }
> = {
  ELITE: { label: "Elite", emoji: "🏆", color: "#ffffff", bg: "rgba(124,58,237,0.92)" },
  PREMIUM: { label: "Premium", emoji: "⭐", color: "#ffffff", bg: "rgba(255,90,31,0.92)" },
  STANDARD: { label: "Standard", emoji: "📦", color: "#374151", bg: "rgba(229,231,235,0.95)" },
  PENDING: { label: "Pending", emoji: "⏳", color: "#92400e", bg: "rgba(254,243,199,0.95)" },
  HIDDEN: { label: "Hidden", emoji: "—", color: "#9CA3AF", bg: "rgba(243,244,246,0.95)" },
};
