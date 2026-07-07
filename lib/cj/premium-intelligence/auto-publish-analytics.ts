import { getCatalogDB } from "./db";

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

export async function computeAutoPublishAnalytics(): Promise<AutoPublishAnalyticsSnapshot> {
  const db = getCatalogDB();
  const now = new Date().toISOString();

  const [
    { count: totalProducts },
    { count: ready },
    { count: pendingEnrichment },
    { count: requirementsMissing },
    { count: published },
    { count: adminOverride },
    intelSample,
    enrichmentTimes,
  ] = await Promise.all([
    db
      .from("cj_product_intelligence")
      .select("pid", { count: "exact", head: true }),
    db
      .from("cj_product_intelligence")
      .select("pid", { count: "exact", head: true })
      .eq("auto_publish_ready", true),
    db
      .from("cj_product_intelligence")
      .select("pid", { count: "exact", head: true })
      .eq("auto_publish_status", "PENDING_ENRICHMENT"),
    db
      .from("cj_product_intelligence")
      .select("pid", { count: "exact", head: true })
      .eq("auto_publish_status", "REQUIREMENTS_MISSING"),
    db
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("source", "cj")
      .eq("status", "active")
      .is("deleted_at", null),
    db
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("published_by_admin_override", true)
      .is("deleted_at", null),
    db
      .from("cj_product_intelligence")
      .select("auto_publish_score, auto_publish_failures")
      .limit(10000),
    db
      .from("cj_product_intelligence")
      .select("enriched_at, created_at")
      .eq("enrichment_status", "complete")
      .not("enriched_at", "is", null)
      .limit(5000),
  ]);

  const rows = intelSample.data ?? [];
  let scoreSum = 0;
  let missingVideo = 0;
  let missingSupplier = 0;
  let missingShipping = 0;
  let missingImages = 0;
  let missingDescription = 0;
  let missingVariants = 0;
  let missingStock = 0;
  let trendingMissing = 0;

  for (const row of rows) {
    scoreSum += Number(row.auto_publish_score ?? 0);
    const failures = Array.isArray(row.auto_publish_failures)
      ? (row.auto_publish_failures as string[])
      : [];

    if (failures.includes("Missing Product Video")) missingVideo++;
    if (failures.includes("Supplier Not Verified")) missingSupplier++;
    if (failures.includes("Fast Shipping Missing")) missingShipping++;
    if (failures.includes("Insufficient Images")) missingImages++;
    if (failures.includes("Incomplete Description")) missingDescription++;
    if (failures.includes("Missing Variants")) missingVariants++;
    if (failures.includes("Out of Stock")) missingStock++;
    if (failures.includes("Product Not Trending")) trendingMissing++;
  }

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
    totalProducts: totalProducts ?? 0,
    ready: ready ?? 0,
    published: published ?? 0,
    pendingEnrichment: pendingEnrichment ?? 0,
    requirementsMissing: requirementsMissing ?? 0,
    adminOverride: adminOverride ?? 0,
    missingVideo,
    missingSupplier,
    missingShipping,
    missingImages,
    missingDescription,
    missingVariants,
    missingStock,
    trendingMissing,
    avgPublishScore: rows.length > 0 ? Math.round((scoreSum / rows.length) * 100) / 100 : 0,
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
