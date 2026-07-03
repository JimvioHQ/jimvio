/** Intelligence payload from CJ detail API (lazy enrichment) */

export interface CJIntelligencePayload {
  pid: string;
  rating?: number;
  reviewCount?: number;
  favoriteCount?: number;
  hasVideo: boolean;
  videoCount: number;
  videoUrls: string[];
  deliveryCycle?: string;
  countryCode?: string;
  warehouseName?: string;
  warehouseInventoryNum?: number;
  verifiedWarehouse?: number;
  supplierVerified: boolean;
  supplierName?: string;
  supplierScore: number;
  listedNum?: number;
  variantCount?: number;
  isFreeShipping?: boolean;
  imageCount?: number;
  descriptionLength?: number;
  enrichedAt: number;
}

export interface CachedIntelligence {
  data: CJIntelligencePayload;
  cachedAt: number;
}
