/** Shared types for CJ Product Import Intelligence */

import type {
  AutoPublishCheckItem,
  AutoPublishDecision,
  AutoPublishStatus,
} from "./auto-publish-engine";

export type CatalogTier = "ELITE" | "PREMIUM" | "STANDARD" | "PENDING" | "HIDDEN";

export type CatalogBadgeId =
  | "video"
  | "trending"
  | "verified"
  | "elite"
  | "premium"
  | "fast-shipping"
  | "high-profit"
  | "in-stock"
  | "us-warehouse"
  | "eu-warehouse"
  | "uk-warehouse";

export interface CatalogBadge {
  id: CatalogBadgeId;
  emoji: string;
  label: string;
}

export interface QualityScoreBreakdown {
  videoScore: number;
  supplierScore: number;
  shippingScore: number;
  profitScore: number;
  trendScore: number;
  stockScore: number;
  reviewScore: number;
  imageQualityScore: number;
  descriptionQualityScore: number;
  opportunityScore: number;
  healthScore: number;
}

export interface CJProduct {
  pid: string;
  productNameEn: string;
  productSku: string;
  bigImage: string;
  sellPrice: string;
  nowPrice: string;
  discountPrice: string;
  categoryName?: string;
  threeCategoryName?: string;
  addMarkStatus: number;
  isFreeShipping?: boolean;
  listedNum: number;
  warehouseInventoryNum?: number;
  verifiedWarehouse?: number;
  deliveryCycle?: string;
  countryCode?: string;
  isVideo?: number;
  videoList?: string[];
  productWeight?: number;
  productType?: string;
  createAt?: number;
  supplierName?: string;
  supplierId?: string;
  variantCount?: number;
  rating?: number;
  reviewCount?: number;
  favoriteCount?: number;
  videoUrl?: string;
  videoCount?: number;
  warehouseName?: string;
  supplierVerified?: boolean;
  /** Set when detail API intelligence has been merged */
  intelligenceEnriched?: boolean;
  /** From lazy enrichment — product image count */
  imageCount?: number;
  /** From lazy enrichment — description character length */
  descriptionLength?: number;
}

export interface EnrichedProduct extends CJProduct {
  intelligence: ProductIntelligence;
}

export interface AutoPublishState {
  ready: boolean;
  score: number;
  status: AutoPublishStatus;
  failures: string[];
  pendingEnrichment: string[];
  checks: AutoPublishCheckItem[];
  decision: AutoPublishDecision;
  lastCheck?: string;
  adminOverride?: boolean;
  /** v3 intelligence (optional — additive) */
  qualityConfidence?: "very_high" | "high" | "medium" | "low";
  qualityExplanation?: string;
  supplierReputation?: {
    score: number;
    label: string;
    blacklisted: boolean;
  };
  duplicateBlocked?: boolean;
  duplicateRefPid?: string;
  publishPriority?: number;
}

export interface ProductIntelligence {
  healthScore: number;
  healthLabel: HealthLabel;
  profit: ProfitMetrics;
  isImported: boolean;
  importedProductId?: string;
  marketFit: MarketFit;
  supplierScore: number;
  trending: boolean;
  hasVariants: boolean;
  stockStable: boolean;
  opportunityScore: number;
  opportunityLevel: OpportunityLevel;
  opportunityReasons: string[];
  aiRecommendation?: string;
  /** Jimvio Premium Catalog tier */
  catalogTier: CatalogTier;
  catalogBadges: CatalogBadge[];
  qualityScores: QualityScoreBreakdown;
  enrichmentStatus?: "pending" | "processing" | "complete" | "failed" | "dead_letter";
  confidenceScore?: number;
  /** Auto Publish Engine — recalculated when product data changes */
  autoPublish?: AutoPublishState;
}

export type OpportunityLevel =
  | "viral"
  | "immediate"
  | "strong"
  | "review"
  | "skip";

export type HealthLabel = "excellent" | "good" | "warning" | "poor";

export interface ProfitMetrics {
  cjCost: number;
  shippingCost: number;
  suggestedSelling: number;
  estimatedProfit: number;
  marginPercent: number;
  roi: number;
}

export interface MarketFit {
  us: boolean;
  eu: boolean;
  uk: boolean;
  worldwide: boolean;
}

/** Server-side CJ API filters */
export interface CJApiFilters {
  keyWord: string;
  categoryId: string;
  minPrice: string;
  maxPrice: string;
  isFreeShipping: string;
  verifiedWarehouse: string;
  countryCode: string;
  deliveryTime: string;
  productFlag: string;
  hasVideo: string;
  sort: string;
  orderBy: string;
  supplierId: string;
}

/** Client-side intelligence filters */
export interface IntelligenceFilters {
  // Trending
  trending: boolean;
  bestSelling: boolean;
  mostFavorited: boolean;
  newArrivals: boolean;
  // Profitability
  highProfitMargin: boolean;
  minProfitPercent: number;
  minProfitAmount: number;
  minRoi: number;
  // Shipping
  fastShipping: boolean;
  freeShipping: boolean;
  usWarehouse: boolean;
  euWarehouse: boolean;
  ukWarehouse: boolean;
  shipsWorldwide: boolean;
  maxDeliveryDays: number;
  // Product quality
  hasVideo: boolean;
  hasVariants: boolean;
  hasDescription: boolean;
  hasSpecifications: boolean;
  highQualityImages: boolean;
  minRating: number;
  minReviewCount: number;
  // Supplier quality
  verifiedSupplier: boolean;
  topSupplier: boolean;
  fastResponseSupplier: boolean;
  highOrderSupplier: boolean;
  lowRefundSupplier: boolean;
  // Health
  minHealthScore: number;
  minOpportunityScore: number;
  // Misc
  hideImported: boolean;
  isDraft: boolean;
  isHidden: boolean;
  // Auto Publish Engine filters
  autoPublishReady: boolean;
  autoPublishPending: boolean;
  autoPublishRequirementsMissing: boolean;
  autoPublishAdminOverride: boolean;
  isPublished: boolean;
  missingVideo: boolean;
  missingSupplier: boolean;
  missingImages: boolean;
  missingDescription: boolean;
  missingShipping: boolean;
  missingVariants: boolean;
  missingStock: boolean;
  missingTrending: boolean;
}

export interface ImportSettings {
  autoPublish: boolean;
  importVideos: boolean;
  importDescriptionImages: boolean;
  importHtmlDescription: boolean;
  importVariants: boolean;
  importSpecifications: boolean;
  importReviews: boolean;
  importSeoMetadata: boolean;
  uploadImagesToCloudinary: boolean;
  uploadVideosToCloudinary: boolean;
  /** UI workflow — publish uses existing publishAdminProduct after import */
  defaultImportMode: ImportMode;
  publishVisibility: PublishVisibility;
  autoPublishRules: AutoPublishRules;
  scheduledAt?: string;
  scheduledTimezone?: string;
}

export interface ImportedProductInfo {
  productId: string;
  name?: string;
  sku?: string;
}

export type ImportedMap = Record<string, ImportedProductInfo>;

export type ImportMode = "draft" | "publish" | "auto";

export type PublishVisibility = "public" | "hidden" | "scheduled";

export interface AutoPublishRules {
  minHealthScore: number;
  minMargin: number;
  maxShippingDays: number;
  requireVerified: boolean;
  requireImages: boolean;
  requireDescription: boolean;
}

export interface ImportLogEntry {
  pid: string;
  name: string;
  productId?: string;
  at: string;
  ok: boolean;
  message?: string;
  published?: boolean;
}
