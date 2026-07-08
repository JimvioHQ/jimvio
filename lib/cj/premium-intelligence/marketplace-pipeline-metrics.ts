/**
 * Marketplace Pipeline Metrics v5 — unified live counts for admin dashboard.
 * Source of truth: cj_product_intelligence (matches catalog filters).
 */

import { getCatalogDB } from "./db";
import { getCached, setCached } from "./catalog-cache";

const PIPELINE_METRICS_CACHE_KEY = "marketplace-pipeline-metrics";
const PIPELINE_METRICS_TTL_MS = 120_000;

const MIN_DESCRIPTION_LENGTH = 80;
const MIN_IMAGE_COUNT = 5;
const FAST_SHIPPING_DAYS = 7;

export interface MarketplacePipelineMetrics {
  ready: number;
  published: number;
  pending: number;
  requirementsMissing: number;
  draft: number;
  hidden: number;
  queuePending: number;
  queueProcessing: number;
  queueFailed: number;
  signalWatchPending: number;
  missingVideo: number;
  missingSupplier: number;
  missingShipping: number;
  missingImages: number;
  missingDescription: number;
  trendingMissing: number;
  adminOverride: number;
  totalProducts: number;
  computedAt: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CountQuery = any;

async function countTable(
  table: string,
  apply?: (q: CountQuery) => CountQuery,
  exact = false
): Promise<number> {
  const db = getCatalogDB();
  const idCol = table === "cj_auto_publish_queue" ? "id" : "pid";
  let q = db
    .from(table)
    .select(idCol, { count: exact ? "exact" : "estimated", head: true });
  if (apply) q = apply(q);
  const { count, error } = await q;
  if (error) throw error;
  return count ?? 0;
}

export async function computeMarketplacePipelineMetrics(): Promise<MarketplacePipelineMetrics> {
  const cached = getCached<MarketplacePipelineMetrics>(PIPELINE_METRICS_CACHE_KEY);
  if (cached) return cached;

  const [
    totalProducts,
    ready,
    pending,
    requirementsMissing,
    hidden,
    published,
    draft,
    adminOverride,
    queuePending,
    queueProcessing,
    queueFailed,
    missingVideo,
    missingSupplier,
    missingShipping,
    missingImages,
    missingDescription,
    trendingMissing,
    signalWatchPending,
  ] = await Promise.all([
    countTable("cj_product_intelligence"),
    countTable(
      "cj_product_intelligence",
      (q) => q.eq("auto_publish_ready", true).eq("auto_publish_status", "READY"),
      true
    ),
    countTable(
      "cj_product_intelligence",
      (q) => q.eq("auto_publish_status", "PENDING_ENRICHMENT"),
      true
    ),
    countTable(
      "cj_product_intelligence",
      (q) => q.eq("auto_publish_status", "REQUIREMENTS_MISSING"),
      true
    ),
    countTable("cj_product_intelligence", (q) => q.eq("catalog_tier", "HIDDEN"), true),
    countTable("cj_product_intelligence", (q) => q.eq("is_published_active", true), true),
    countTable(
      "cj_product_intelligence",
      (q) => q.not("linked_product_id", "is", null).eq("is_published_active", false),
      true
    ),
    countTable("cj_product_intelligence", (q) => q.eq("is_admin_override", true)),
    countTable("cj_auto_publish_queue", (q) => q.eq("status", "pending"), true),
    countTable("cj_auto_publish_queue", (q) => q.eq("status", "processing"), true),
    countTable(
      "cj_auto_publish_queue",
      (q) => q.in("status", ["failed", "dead_letter"]),
      true
    ),
    countTable("cj_product_intelligence", (q) => q.eq("has_video", false)),
    countTable("cj_product_intelligence", (q) => q.eq("supplier_verified", false)),
    countTable("cj_product_intelligence", (q) =>
      q.or(`delivery_days.gt.${FAST_SHIPPING_DAYS},delivery_days.is.null`)
    ),
    countTable("cj_product_intelligence", (q) => q.lt("image_count", MIN_IMAGE_COUNT)),
    countTable("cj_product_intelligence", (q) =>
      q.lt("description_length", MIN_DESCRIPTION_LENGTH)
    ),
    countTable("cj_product_intelligence", (q) => q.eq("trending", false)),
    (async () => {
      try {
        return await countTable("cj_signal_watch_queue", (q) => q.eq("status", "pending"));
      } catch {
        return 0;
      }
    })(),
  ]);

  const result = {
    totalProducts,
    ready,
    published,
    pending,
    requirementsMissing,
    draft,
    hidden,
    queuePending,
    queueProcessing,
    queueFailed,
    signalWatchPending,
    missingVideo,
    missingSupplier,
    missingShipping,
    missingImages,
    missingDescription,
    trendingMissing,
    adminOverride,
    computedAt: new Date().toISOString(),
  };

  setCached(PIPELINE_METRICS_CACHE_KEY, result, PIPELINE_METRICS_TTL_MS);
  return result;
}
