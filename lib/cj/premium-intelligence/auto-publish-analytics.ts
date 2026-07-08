import { getCatalogDB } from "./db";
import { FAILURE_LABELS } from "./catalog-filter-index";

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
  let q = db.from("cj_product_intelligence").select("pid", { count: "exact", head: true });
  if (apply) q = apply(q);
  const { count } = await q;
  return count ?? 0;
}

export async function computeAutoPublishAnalytics(): Promise<AutoPublishAnalyticsSnapshot> {
  const db = getCatalogDB();
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
    scoreSample,
    enrichmentTimes,
  ] = await Promise.all([
    countIntel(),
    countIntel((q) =>
      q.eq("auto_publish_ready", true).eq("auto_publish_status", "READY")
    ),
    countIntel((q) => q.eq("auto_publish_status", "PENDING_ENRICHMENT")),
    countIntel((q) => q.eq("auto_publish_status", "REQUIREMENTS_MISSING")),
    db
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("source", "cj")
      .eq("status", "active")
      .is("deleted_at", null)
      .then(({ count }) => count ?? 0),
    countIntel((q) => q.eq("is_admin_override", true)),
    countIntel((q) =>
      q.contains("auto_publish_failures", [FAILURE_LABELS.missingVideo])
    ),
    countIntel((q) =>
      q.contains("auto_publish_failures", [FAILURE_LABELS.missingSupplier])
    ),
    countIntel((q) =>
      q.contains("auto_publish_failures", [FAILURE_LABELS.missingShipping])
    ),
    countIntel((q) =>
      q.contains("auto_publish_failures", [FAILURE_LABELS.missingImages])
    ),
    countIntel((q) =>
      q.contains("auto_publish_failures", [FAILURE_LABELS.missingDescription])
    ),
    countIntel((q) =>
      q.contains("auto_publish_failures", [FAILURE_LABELS.missingVariants])
    ),
    countIntel((q) =>
      q.contains("auto_publish_failures", [FAILURE_LABELS.missingStock])
    ),
    countIntel((q) =>
      q.contains("auto_publish_failures", [FAILURE_LABELS.missingTrending])
    ),
    db
      .from("cj_product_intelligence")
      .select("auto_publish_score")
      .eq("enrichment_status", "complete")
      .limit(5000),
    db
      .from("cj_product_intelligence")
      .select("enriched_at, created_at")
      .eq("enrichment_status", "complete")
      .not("enriched_at", "is", null)
      .limit(5000),
  ]);

  const scoreRows = scoreSample.data ?? [];
  const scoreSum = scoreRows.reduce(
    (acc, r) => acc + Number(r.auto_publish_score ?? 0),
    0
  );

  let avgEnrichmentTimeMs: number | null = null;
  const timeRows = enrichmentTimes.data ?? [];
  if (timeRows.length > 0) {
    const totalMs = timeRows.reduce((acc, r) => {
      const start = new Date(r.created_at as string).getTime();
      const end = new Date(r.enriched_at as string).getTime();
      return acc + Math.max(0, end - start);
    }, 0);
    avgEnrichmentTimeMs = Math.round(totalMs / timeRows.length);
  }

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
    avgPublishScore:
      scoreRows.length > 0
        ? Math.round((scoreSum / scoreRows.length) * 100) / 100
        : 0,
    avgEnrichmentTimeMs,
    snapshotAt: now,
  };

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

  return snapshot;
}

export async function getLatestAutoPublishAnalytics(): Promise<AutoPublishAnalyticsSnapshot | null> {
  const db = getCatalogDB();
  const { data } = await db
    .from("cj_auto_publish_analytics")
    .select("*")
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
