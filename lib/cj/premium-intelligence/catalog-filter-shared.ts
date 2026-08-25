import type { IntelligenceFilters } from "../import-intelligence/types";

/** Serializable filter params from API / UI */
export interface CatalogFilterIndex {
  hasVideo?: boolean;
  verifiedSupplier?: boolean;
  trending?: boolean;
  fastShipping?: boolean;
  usWarehouse?: boolean;
  euWarehouse?: boolean;
  ukWarehouse?: boolean;
  minImages?: number;
  hasDescription?: boolean;
  autoPublishReady?: boolean;
  autoPublishPending?: boolean;
  autoPublishRequirementsMissing?: boolean;
  autoPublishAdminOverride?: boolean;
  isPublished?: boolean;
  missingVideo?: boolean;
  missingSupplier?: boolean;
  missingShipping?: boolean;
  missingImages?: boolean;
  missingDescription?: boolean;
  missingVariants?: boolean;
  missingStock?: boolean;
  missingTrending?: boolean;
  hideImported?: boolean;
  isDraft?: boolean;
  isHidden?: boolean;
  publishQueueStatus?: "pending" | "processing" | "failed";
  minHealthScore?: number;
  minMargin?: number;
}

export function intelligenceFiltersToCatalogIndex(
  filters: IntelligenceFilters
): CatalogFilterIndex {
  return {
    hasVideo: Boolean(filters.hasVideo),
    verifiedSupplier: Boolean(filters.verifiedSupplier),
    trending: Boolean(filters.trending),
    fastShipping: Boolean(filters.fastShipping),
    usWarehouse: Boolean(filters.usWarehouse),
    euWarehouse: Boolean(filters.euWarehouse),
    ukWarehouse: Boolean(filters.ukWarehouse),
    minImages: filters.highQualityImages ? 5 : undefined,
    hasDescription: Boolean(filters.hasDescription),
    autoPublishReady: Boolean(filters.autoPublishReady),
    autoPublishPending: Boolean(filters.autoPublishPending),
    autoPublishRequirementsMissing: Boolean(filters.autoPublishRequirementsMissing),
    autoPublishAdminOverride: Boolean(filters.autoPublishAdminOverride),
    isPublished: Boolean(filters.isPublished),
    missingVideo: Boolean(filters.missingVideo),
    missingSupplier: Boolean(filters.missingSupplier),
    missingShipping: Boolean(filters.missingShipping),
    missingImages: Boolean(filters.missingImages),
    missingDescription: Boolean(filters.missingDescription),
    missingVariants: Boolean(filters.missingVariants),
    missingStock: Boolean(filters.missingStock),
    missingTrending: Boolean(filters.missingTrending),
    hideImported: Boolean(filters.hideImported),
    isDraft: Boolean(filters.isDraft),
    isHidden: Boolean(filters.isHidden),
    publishQueueStatus: filters.publishQueueStatus,
    minHealthScore:
      typeof filters.minHealthScore === "number" && filters.minHealthScore > 0
        ? filters.minHealthScore
        : undefined,
    minMargin:
      typeof filters.minProfitPercent === "number" && filters.minProfitPercent > 0
        ? filters.minProfitPercent
        : undefined,
  };
}
