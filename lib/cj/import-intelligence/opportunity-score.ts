import type { EnrichedProduct, OpportunityLevel } from "./types";
import {
  deliveryDays,
  getReviewCount,
  productHasVideo,
} from "./product-utils";
import { hasCatalogVideo, isVerifiedSupplier } from "./quick-filter-intelligence";

const MAX = {
  margin: 25,
  video: 15,
  shipping: 15,
  supplier: 15,
  reviews: 10,
  rating: 10,
  warehouse: 5,
  completeness: 5,
} as const;

export const OPPORTUNITY_LEVELS: Record<
  OpportunityLevel,
  { label: string; emoji: string; color: string; bg: string }
> = {
  viral: {
    label: "Viral Opportunity",
    emoji: "🚀",
    color: "#7c3aed",
    bg: "rgba(124,58,237,0.92)",
  },
  immediate: {
    label: "Import Immediately",
    emoji: "🔥",
    color: "#ffffff",
    bg: "rgba(255,90,31,0.92)",
  },
  strong: {
    label: "Strong Candidate",
    emoji: "✅",
    color: "#ffffff",
    bg: "rgba(16,185,129,0.9)",
  },
  review: {
    label: "Review First",
    emoji: "⚠",
    color: "#ffffff",
    bg: "rgba(245,158,11,0.92)",
  },
  skip: {
    label: "Skip Product",
    emoji: "❌",
    color: "#ffffff",
    bg: "rgba(107,114,128,0.88)",
  },
};

export interface OpportunityBreakdown {
  margin: number;
  video: number;
  shipping: number;
  supplier: number;
  reviews: number;
  rating: number;
  warehouse: number;
  completeness: number;
}

export interface OpportunityResult {
  score: number;
  level: OpportunityLevel;
  reasons: string[];
  breakdown: OpportunityBreakdown;
  aiRecommendation?: string;
}

export function getOpportunityLevel(score: number): OpportunityLevel {
  if (score >= 95) return "viral";
  if (score >= 85) return "immediate";
  if (score >= 75) return "strong";
  if (score >= 60) return "review";
  return "skip";
}

function scoreMargin(marginPercent: number): number {
  if (marginPercent <= 0) return 0;
  return Math.min(MAX.margin, Math.round((marginPercent / 48) * MAX.margin));
}

function scoreShipping(days: number | null): number {
  if (days === null) return 4;
  if (days <= 3) return MAX.shipping;
  if (days <= 7) return Math.round(MAX.shipping - (days - 3) * 0.33);
  if (days <= 14) return Math.max(6, Math.round(12 - (days - 7)));
  return Math.max(0, Math.round(6 - (days - 14) * 0.4));
}

function scoreSupplier(p: EnrichedProduct): number {
  if (isVerifiedSupplier(p)) return MAX.supplier;
  const supplierScore = p.intelligence?.supplierScore ?? 50;
  return Math.round((supplierScore / 100) * MAX.supplier);
}

function scoreReviews(count: number): number {
  if (count <= 0) return 0;
  return Math.min(MAX.reviews, Math.round(count / 15));
}

function scoreRating(rating?: number): number {
  if (typeof rating !== "number" || rating <= 0) return 0;
  return Math.min(MAX.rating, Math.round((rating / 5) * MAX.rating));
}

function scoreWarehouse(p: EnrichedProduct): number {
  const code = (p.countryCode ?? "").toUpperCase();
  if (code === "US" || code === "USA") return MAX.warehouse;
  if (["GB", "DE", "FR", "EU", "AU"].includes(code)) return 4;
  if (code === "CN") return 2;
  const warehouse = (p.warehouseName ?? "").toLowerCase();
  if (warehouse.includes("united states") || warehouse.includes("usa")) return MAX.warehouse;
  return 3;
}

function scoreCompleteness(p: EnrichedProduct): number {
  const intel = p.intelligence;
  let pts = 0;
  if (p.bigImage?.startsWith("http")) pts += 2;
  if (p.threeCategoryName || p.categoryName) pts += 1;
  if (intel?.hasVariants) pts += 1;
  if ((p.warehouseInventoryNum ?? 0) > 0) pts += 1;
  return Math.min(MAX.completeness, pts);
}

function buildReasons(
  p: EnrichedProduct,
  breakdown: OpportunityBreakdown
): string[] {
  const reasons: string[] = [];
  const margin = p.intelligence.profit.marginPercent;
  const days = deliveryDays(p);
  const reviews = getReviewCount(p);
  const rating = p.rating;

  if (breakdown.margin >= 18) reasons.push(`${margin}% margin`);
  if (breakdown.video > 0) reasons.push("Product video available");
  if (breakdown.shipping >= 12 && days !== null)
    reasons.push(`Fast shipping (${days}d)`);
  else if (breakdown.shipping >= 12) reasons.push("Fast shipping");
  if (breakdown.supplier >= 14) reasons.push("Verified supplier");
  else if (breakdown.supplier >= 10) reasons.push("Strong supplier score");
  if (breakdown.reviews >= 6) reasons.push("High review count");
  if (breakdown.rating >= 8 && rating) reasons.push(`${rating.toFixed(1)} rating`);
  if (breakdown.warehouse >= 4) reasons.push("Premium warehouse");
  if (breakdown.completeness >= 4) reasons.push("Complete listing");

  return reasons.slice(0, 6);
}

function buildAiRecommendation(score: number): string | undefined {
  if (score >= 95) return "Potential winner product.";
  if (score >= 90) return "AI recommends importing this product.";
  return undefined;
}

export function calculateOpportunityScore(p: EnrichedProduct): OpportunityResult {
  const margin = p.intelligence.profit.marginPercent;
  const days = deliveryDays(p);
  const reviews = getReviewCount(p);

  const breakdown: OpportunityBreakdown = {
    margin: scoreMargin(margin),
    video: hasCatalogVideo(p) || productHasVideo(p) ? MAX.video : 0,
    shipping: scoreShipping(days),
    supplier: scoreSupplier(p),
    reviews: scoreReviews(reviews),
    rating: scoreRating(p.rating),
    warehouse: scoreWarehouse(p),
    completeness: scoreCompleteness(p),
  };

  const raw =
    breakdown.margin +
    breakdown.video +
    breakdown.shipping +
    breakdown.supplier +
    breakdown.reviews +
    breakdown.rating +
    breakdown.warehouse +
    breakdown.completeness;

  const score = Math.min(100, Math.max(0, Math.round(raw)));
  const level = getOpportunityLevel(score);
  const reasons = buildReasons(p, breakdown);
  const aiRecommendation = buildAiRecommendation(score);

  return { score, level, reasons, breakdown, aiRecommendation };
}

/** Lower = safer import (for lowest-risk sort) */
export function calculateRiskScore(p: EnrichedProduct): number {
  const opp = p.intelligence.opportunityScore;
  let risk = 100 - opp;
  if (!p.intelligence.stockStable) risk += 8;
  if (!isVerifiedSupplier(p)) risk += 6;
  const days = deliveryDays(p);
  if (days !== null && days > 14) risk += 8;
  if (!hasCatalogVideo(p) && !productHasVideo(p)) risk += 4;
  return risk;
}
