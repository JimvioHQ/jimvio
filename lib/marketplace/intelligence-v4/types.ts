/**
 * Marketplace Intelligence Engine v4 — shared types.
 * Read-only intelligence layer. Never modifies publish/import/sync.
 */

export type QualityLabel = "Excellent" | "Very Good" | "Good" | "Average" | "Poor";
export type QualityConfidence = "very_high" | "high" | "medium" | "low";
export type WarehouseCode = "US" | "EU" | "UK" | "CN";

export interface MarketplaceProductSignals {
  productId: string;
  name: string;
  slug?: string;
  price: number;
  compareAtPrice?: number | null;
  costPrice?: number | null;
  viewCount: number;
  saleCount: number;
  wishlistCount: number;
  reviewCount: number;
  rating: number;
  categoryId?: string | null;
  shippingFrom?: string | null;
  deliveryTime?: string | null;
  hasVideo: boolean;
  isFreeShipping: boolean;
  affiliateCommissionRate?: number | null;
  source?: string | null;
  cjPid?: string | null;
  /** From CJ intelligence (read-only) */
  supplierReputation?: number;
  qualityConfidence?: QualityConfidence;
  publishPriority?: number;
  autoPublishReady?: boolean;
}

export interface RankFactors {
  trending: number;
  conversion: number;
  clicks: number;
  wishlist: number;
  orders: number;
  reviews: number;
  refundRate: number;
  supplierReputation: number;
  fastShipping: number;
  video: number;
  qualityConfidence: number;
}

export interface MarketplaceRankResult {
  productId: string;
  rankScore: number;
  marketplaceRank?: number;
  factors: RankFactors;
  qualityScore: number;
  qualityLabel: QualityLabel;
  jimvioTrendingScore: number;
}

export interface CustomerMatchInput {
  userId?: string;
  sessionId?: string;
  countryCode: string;
  language: string;
  currency: string;
  viewedProductIds: string[];
  wishlistProductIds: string[];
  cartProductIds: string[];
  searchTerms: string[];
  categoryPreferences: string[];
  communityInterests: string[];
}

export interface CustomerMatchResult {
  productId: string;
  matchScore: number;
  reasons: string[];
}

export interface PriceRecommendation {
  currentPrice: number;
  recommendedPrice: number;
  minPrice: number;
  maxPrice: number;
  strategy: "increase" | "decrease" | "maintain";
  reasoning: string[];
}

export interface ShippingRecommendation {
  recommendedWarehouse: WarehouseCode;
  alternatives: Array<{
    warehouse: WarehouseCode;
    label: string;
    score: number;
    reason: string;
  }>;
}

export interface SeasonContext {
  activeSeasons: string[];
  keywords: string[];
}

export interface MarketplaceHealthSnapshot {
  healthPercent: number;
  healthLabel: string;
  avgQuality: number;
  avgShippingDays: number | null;
  conversionRate: number;
  refundPrediction: number;
  supplierHealth: number;
  videoPercent: number;
  duplicatePercent: number;
  trendingPercent: number;
  fastShippingPercent: number;
  totalProducts: number;
  activeProducts: number;
  revenue7d: number;
  orders7d: number;
  ctrAvg: number;
  snapshotAt: string;
}

export interface AiRecommendation {
  category: string;
  issue: string;
  productCount: number;
  recommendation: string;
  action: string;
  priority: number;
}

export interface CategoryIntelligence {
  categoryId: string;
  categoryName: string;
  conversionRate: number;
  revenueTotal: number;
  growthRate: number;
  refundRate: number;
  productCount: number;
  rank?: number;
}

export interface AffiliatePick {
  productId: string;
  name: string;
  affiliateScore: number;
  conversionRate: number;
  commissionRate: number;
  hasVideo: boolean;
  trendingScore: number;
}

export interface HomepageSection {
  id: string;
  title: string;
  description: string;
  productIds: string[];
}

export type IntelligenceEventType =
  | "rank_update"
  | "trending_update"
  | "duplicate_hidden"
  | "quality_recalc"
  | "price_recommendation"
  | "shipping_recommendation"
  | "season_match"
  | "learning_update"
  | "health_snapshot"
  | "category_update"
  | "search_update";
