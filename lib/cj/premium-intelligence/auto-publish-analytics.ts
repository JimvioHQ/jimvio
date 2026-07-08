import { getCatalogDB } from "./db";
import { getCached, setCached } from "./catalog-cache";

const MIN_DESCRIPTION_LENGTH = 80;
const MIN_IMAGE_COUNT = 5;
const FAST_SHIPPING_DAYS = 7;

/** Recompute at most once per interval unless refresh=1 */
const SNAPSHOT_MIN_INTERVAL_MS = 10 * 60_000;
const ANALYTICS_CACHE_KEY = "auto-publish-analytics";
const ANALYTICS_CACHE_TTL_MS = 5 * 60_000;

/** Sample size for avg metrics — avoids full-table paginated scans */
const AVG_SAMPLE_SIZE = 500;

export interface AutoPublishAnalyticsSnapshot {
  totalProducts: number;
  ready: number;
  published: number;
  pendingEnrichment: number;
  requirementsMissing: number;
  adminOverride: number;
  missingVideo: number;
  missingSupplier: number;
  missingShipping: number;
  missingImages: number;
  missingDescription: number;
  missingVariants: number;
  missingStock: number;
  trendingMissing: number;
  avgPublishScore: number;
  avgEnrichmentTimeMs: number | null;
  snapshotAt: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CountQuery = any;

async function countIntel(apply?: (q: CountQuery) => CountQuery): Promise<number> {
  const db = getCatalogDB();
  let q = db.from("cj_product_intelligence").select("pid", { count: "estimated", head: true });
  if (apply) q = apply(q);
  const { count } = await q;
  return count ?? 0;
}

/** Exact counts for dashboard cards — must match DB (indexed partial predicates). */
async function countIntelExact(apply?: (q: CountQuery) => CountQuery): Promise<number> {
  const db = getCatalogDB();
  let q = db.from("cj_product_intelligence").select("pid", { count: "exact", head: true });
  if (apply) q = apply(q);
  const { count, error } = await q;
  if (error) throw error;
  return count ?? 0;
}

/** Indexed sample — recent complete rows only */
async function computeAvgEnrichmentTimeMs(): Promise<number | null> {
  const db = getCatalogDB();
  const { data, error } = await db
    .from("cj_product_intelligence")
    .select("enriched_at, created_at")
    .eq("enrichment_status", "complete")
    .not("enriched_at", "is", null)
    .order("enriched_at", { ascending: false })
    .limit(AVG_SAMPLE_SIZE);

  if (error || !data?.length) return null;

  const MAX_MS = 7 * 24 * 60 * 60 * 1000;
  let totalMs = 0;
  let count = 0;

  for (const row of data) {
    const start = new Date(row.created_at as string).getTime();
    const end = new Date(row.enriched_at as string).getTime();
    const delta = end - start;
    if (delta > 0 && delta < MAX_MS) {
      totalMs += delta;
      count += 1;
    }
  }

  return count > 0 ? Math.round(totalMs / count) : null;
}

async function computeAvgPublishScore(): Promise<number> {
  const db = getCatalogDB();
  const { data, error } = await db
    .from("cj_product_intelligence")
    .select("auto_publish_score")
    .eq("enrichment_status", "complete")
    .order("updated_at", { ascending: false })
    .limit(AVG_SAMPLE_SIZE);

  if (error || !data?.length) return 0;

  let total = 0;
  for (const row of data) {
    total += Number(row.auto_publish_score ?? 0);
  }
  return Math.round((total / data.length) * 100) / 100;
}

async function shouldWriteSnapshot(): Promise<boolean> {
  const latest = await getLatestAutoPublishAnalytics();
  if (!latest) return true;
  const age = Date.now() - new Date(latest.snapshotAt).getTime();
  return age >= SNAPSHOT_MIN_INTERVAL_MS;
}

export async function computeAutoPublishAnalytics(options?: {
  force?: boolean;
}): Promise<AutoPublishAnalyticsSnapshot> {
  if (!options?.force) {
    const cached = getCached<AutoPublishAnalyticsSnapshot>(ANALYTICS_CACHE_KEY);
    if (cached) return cached;
  }

  const now = new Date().toISOString();

  const [
    totalProducts,
    ready,
    pendingEnrichment,
    requirementsMissing,
    published,
    adminOverride,
    missingVideo,
    missingSupplier,
    missingShipping,
    missingImages,
    missingDescription,
    missingVariants,
    missingStock,
    trendingMissing,
    avgPublishScore,
    avgEnrichmentTimeMs,
  ] = await Promise.all([
    countIntel(),
    countIntelExact((q) =>
      q.eq("auto_publish_ready", true).eq("auto_publish_status", "READY")
    ),
    countIntelExact((q) => q.eq("auto_publish_status", "PENDING_ENRICHMENT")),
    countIntelExact((q) => q.eq("auto_publish_status", "REQUIREMENTS_MISSING")),
    countIntelExact((q) => q.eq("is_published_active", true)),
    countIntel((q) => q.eq("is_admin_override", true)),
    countIntel((q) => q.eq("has_video", false)),
    countIntel((q) => q.eq("supplier_verified", false)),
    countIntel((q) =>
      q.or(`delivery_days.gt.${FAST_SHIPPING_DAYS},delivery_days.is.null`)
    ),
    countIntel((q) => q.lt("image_count", MIN_IMAGE_COUNT)),
    countIntel((q) => q.lt("description_length", MIN_DESCRIPTION_LENGTH)),
    countIntel((q) =>
      q.contains("auto_publish_failures", ["Missing Variants"])
    ),
    countIntel((q) =>
      q.contains("auto_publish_failures", ["Out of Stock"])
    ),
    countIntel((q) => q.eq("trending", false)),
    computeAvgPublishScore(),
    computeAvgEnrichmentTimeMs(),
  ]);

  const snapshot: AutoPublishAnalyticsSnapshot = {
    totalProducts,
    ready,
    published,
    pendingEnrichment,
    requirementsMissing,
    adminOverride,
    missingVideo,
    missingSupplier,
    missingShipping,
    missingImages,
    missingDescription,
    missingVariants,
    missingStock,
    trendingMissing,
    avgPublishScore,
    avgEnrichmentTimeMs,
    snapshotAt: now,
  };

  setCached(ANALYTICS_CACHE_KEY, snapshot, ANALYTICS_CACHE_TTL_MS);

  if (options?.force || (await shouldWriteSnapshot())) {
    const db = getCatalogDB();
    await db.from("cj_auto_publish_analytics").insert({
      snapshot_at: now,
      total_products: snapshot.totalProducts,
      ready_count: snapshot.ready,
      published_count: snapshot.published,
      pending_enrichment: snapshot.pendingEnrichment,
      requirements_missing: snapshot.requirementsMissing,
      admin_override_count: snapshot.adminOverride,
      missing_video: snapshot.missingVideo,
      missing_supplier: snapshot.missingSupplier,
      missing_shipping: snapshot.missingShipping,
      missing_images: snapshot.missingImages,
      missing_description: snapshot.missingDescription,
      missing_variants: snapshot.missingVariants,
      missing_stock: snapshot.missingStock,
      trending_missing: snapshot.trendingMissing,
      avg_publish_score: snapshot.avgPublishScore,
      avg_enrichment_time_ms: snapshot.avgEnrichmentTimeMs,
    });
  }

  return snapshot;
}

export async function getLatestAutoPublishAnalytics(): Promise<AutoPublishAnalyticsSnapshot | null> {
  const db = getCatalogDB();
  const { data } = await db
    .from("cj_auto_publish_analytics")
    .select(
      "snapshot_at, total_products, ready_count, published_count, pending_enrichment, requirements_missing, admin_override_count, missing_video, missing_supplier, missing_shipping, missing_images, missing_description, missing_variants, missing_stock, trending_missing, avg_publish_score, avg_enrichment_time_ms"
    )
    .order("snapshot_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  return {
    totalProducts: data.total_products,
    ready: data.ready_count,
    published: data.published_count,
    pendingEnrichment: data.pending_enrichment,
    requirementsMissing: data.requirements_missing,
    adminOverride: data.admin_override_count,
    missingVideo: data.missing_video,
    missingSupplier: data.missing_supplier,
    missingShipping: data.missing_shipping,
    missingImages: data.missing_images,
    missingDescription: data.missing_description,
    missingVariants: data.missing_variants,
    missingStock: data.missing_stock,
    trendingMissing: data.trending_missing,
    avgPublishScore: Number(data.avg_publish_score),
    avgEnrichmentTimeMs: data.avg_enrichment_time_ms
      ? Number(data.avg_enrichment_time_ms)
      : null,
    snapshotAt: data.snapshot_at,
  };
}
