/**
 * Marketplace Pipeline Metrics v5 — unified live counts for admin dashboard.
 */

import { getCatalogDB } from "./db";

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
  apply?: (q: CountQuery) => CountQuery
): Promise<number> {
  const db = getCatalogDB();
  let q = db.from(table).select("*", { count: "exact", head: true });
  if (apply) q = apply(q);
  const { count } = await q;
  return count ?? 0;
}

export async function computeMarketplacePipelineMetrics(): Promise<MarketplacePipelineMetrics> {
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
    countTable("cj_product_intelligence", (q) =>
      q.eq("auto_publish_ready", true).eq("auto_publish_status", "READY")
    ),
    countTable("cj_product_intelligence", (q) =>
      q.eq("auto_publish_status", "PENDING_ENRICHMENT")
    ),
    countTable("cj_product_intelligence", (q) =>
      q.eq("auto_publish_status", "REQUIREMENTS_MISSING")
    ),
    countTable("cj_product_intelligence", (q) => q.eq("catalog_tier", "HIDDEN")),
    countTable("cj_product_intelligence", (q) => q.eq("is_published_active", true)),
    countTable("products", (q) =>
      q.eq("source", "cj").eq("status", "draft").is("deleted_at", null)
    ),
    countTable("cj_product_intelligence", (q) => q.eq("is_admin_override", true)),
    countTable("cj_auto_publish_queue", (q) => q.eq("status", "pending")),
    countTable("cj_auto_publish_queue", (q) => q.eq("status", "processing")),
    countTable("cj_auto_publish_queue", (q) =>
      q.in("status", ["failed", "dead_letter"])
    ),
    countTable("cj_product_intelligence", (q) =>
      q.contains("auto_publish_failures", ["Missing Product Video"])
    ),
    countTable("cj_product_intelligence", (q) =>
      q.contains("auto_publish_failures", ["Supplier Not Verified"])
    ),
    countTable("cj_product_intelligence", (q) =>
      q.contains("auto_publish_failures", ["Fast Shipping Missing"])
    ),
    countTable("cj_product_intelligence", (q) =>
      q.contains("auto_publish_failures", ["Insufficient Images"])
    ),
    countTable("cj_product_intelligence", (q) =>
      q.contains("auto_publish_failures", ["Incomplete Description"])
    ),
    countTable("cj_product_intelligence", (q) =>
      q.contains("auto_publish_failures", ["Product Not Trending"])
    ),
    (async () => {
      try {
        return await countTable("cj_signal_watch_queue", (q) => q.eq("status", "pending"));
      } catch {
        return 0;
      }
    })(),
  ]);

  return {
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
}
