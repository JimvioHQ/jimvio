/** CJ Premium Intelligence — database row types */

export type EnrichmentStatus =
  | "pending"
  | "processing"
  | "complete"
  | "failed"
  | "dead_letter";

export type CatalogTier =
  | "ELITE"
  | "PREMIUM"
  | "STANDARD"
  | "PENDING"
  | "HIDDEN";

export type CatalogJobType =
  | "list_sync"
  | "enrichment"
  | "stock_refresh"
  | "price_refresh"
  | "shipping_refresh"
  | "score_recalc";

export interface CjRawProductRow {
  pid: string;
  title: string;
  image: string | null;
  supplier: string | null;
  cost: number | null;
  sell_price: number | null;
  stock: number;
  orders: number;
  warehouse: string | null;
  country_code: string | null;
  sku: string | null;
  raw_payload: Record<string, unknown>;
  list_synced_at: string;
  created_at: string;
  updated_at: string;
}

export interface CjProductIntelligenceRow {
  pid: string;
  enrichment_status: EnrichmentStatus;
  enrichment_attempts: number;
  enriched_at: string | null;
  last_error: string | null;
  has_video: boolean;
  video_count: number;
  image_count: number;
  description_length: number;
  delivery_days: number | null;
  rating: number | null;
  review_count: number;
  supplier_verified: boolean;
  verified_warehouse: number | null;
  margin_percent: number | null;
  health_score: number;
  confidence_score: number;
  quality_scores: Record<string, number>;
  opportunity_score: number;
  catalog_tier: CatalogTier;
  trending: boolean;
  badges: Array<{ id: string; emoji: string; label: string }>;
  scored_at: string | null;
  auto_publish_ready: boolean;
  auto_publish_score: number;
  auto_publish_status: string;
  auto_publish_failures: string[];
  pending_enrichment_reasons: string[];
  last_auto_publish_check: string | null;
  created_at: string;
  updated_at: string;
}

export interface CatalogListParams {
  page: number;
  pageSize: number;
  search?: string;
  tiers?: CatalogTier[];
  sort?: "curated" | "health" | "margin" | "orders" | "newest";
  cursor?: string | null;
}

export interface CatalogCursor {
  orders: number;
  pid: string;
  health_score?: number;
}

export interface CatalogListResult {
  products: Array<CjRawProductRow & { intelligence: CjProductIntelligenceRow }>;
  total: number;
  tierCounts?: Record<CatalogTier, number>;
  nextCursor?: string | null;
}

export interface SyncListResult {
  fetched: number;
  saved: number;
  enqueued: number;
  errors: number;
}

export interface EnrichmentBatchResult {
  processed: number;
  succeeded: number;
  failed: number;
}
