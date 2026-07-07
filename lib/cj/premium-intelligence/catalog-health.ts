/**
 * Catalog Health v3 — live health metrics and snapshots.
 */

import { getCatalogDB } from "./db";

export interface CatalogHealthSnapshot {
  healthPercent: number;
  healthLabel: string;
  ready: number;
  published: number;
  pending: number;
  draft: number;
  hidden: number;
  unpublished: number;
  supplierIssues: number;
  shippingIssues: number;
  videoMissing: number;
  duplicateCount: number;
  readyPercent: number;
  publishPercent: number;
  duplicateRate: number;
  avgSupplierQuality: number;
  marketplaceHealth: number;
  snapshotAt: string;
}

function healthLabel(percent: number): string {
  if (percent >= 95) return "Excellent";
  if (percent >= 80) return "Good";
  if (percent >= 60) return "Fair";
  return "Poor";
}

export async function computeCatalogHealth(): Promise<CatalogHealthSnapshot> {
  const db = getCatalogDB();
  const now = new Date().toISOString();

  const [
    { count: totalIntel },
    { count: ready },
    { count: pending },
    { count: hidden },
    { count: published },
    { count: draft },
    { count: unpublished },
    { count: supplierIssues },
    { count: shippingIssues },
    { count: videoMissing },
    { count: duplicateCount },
    supplierAvg,
  ] = await Promise.all([
    db.from("cj_product_intelligence").select("pid", { count: "exact", head: true }),
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
      .eq("catalog_tier", "HIDDEN"),
    db
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("source", "cj")
      .eq("status", "active")
      .is("deleted_at", null),
    db
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("source", "cj")
      .eq("status", "draft")
      .is("deleted_at", null),
    db
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("auto_unpublished", true),
    db
      .from("cj_supplier_reputation")
      .select("supplier_id", { count: "exact", head: true })
      .eq("blacklisted", true),
    db
      .from("cj_product_intelligence")
      .select("pid", { count: "exact", head: true })
      .contains("auto_publish_failures", ["Fast Shipping Missing"]),
    db
      .from("cj_product_intelligence")
      .select("pid", { count: "exact", head: true })
      .contains("auto_publish_failures", ["Missing Product Video"]),
    db
      .from("cj_product_duplicates")
      .select("id", { count: "exact", head: true })
      .eq("blocked", true),
    db.from("cj_supplier_reputation").select("reputation_score").limit(1000),
  ]);

  const total = totalIntel ?? 1;
  const readyPct = Math.round(((ready ?? 0) / total) * 10000) / 100;
  const publishPct = Math.round(((published ?? 0) / total) * 10000) / 100;
  const dupRate = Math.round(((duplicateCount ?? 0) / total) * 10000) / 100;

  const supplierScores = (supplierAvg.data ?? []).map((r) =>
    Number(r.reputation_score ?? 50)
  );
  const avgSupplier =
    supplierScores.length > 0
      ? Math.round(
          (supplierScores.reduce((a, b) => a + b, 0) / supplierScores.length) * 100
        ) / 100
      : 50;

  const healthPercent = Math.round(
    readyPct * 0.4 + publishPct * 0.3 + avgSupplier * 0.2 + (100 - dupRate) * 0.1
  );

  const marketplaceHealth = Math.round(
    publishPct * 0.5 + readyPct * 0.3 + (100 - (supplierIssues ?? 0)) * 0.2
  );

  const snapshot: CatalogHealthSnapshot = {
    healthPercent,
    healthLabel: healthLabel(healthPercent),
    ready: ready ?? 0,
    published: published ?? 0,
    pending: pending ?? 0,
    draft: draft ?? 0,
    hidden: hidden ?? 0,
    unpublished: unpublished ?? 0,
    supplierIssues: supplierIssues ?? 0,
    shippingIssues: shippingIssues ?? 0,
    videoMissing: videoMissing ?? 0,
    duplicateCount: duplicateCount ?? 0,
    readyPercent: readyPct,
    publishPercent: publishPct,
    duplicateRate: dupRate,
    avgSupplierQuality: avgSupplier,
    marketplaceHealth,
    snapshotAt: now,
  };

  await db.from("cj_catalog_health").insert({
    snapshot_at: now,
    health_percent: snapshot.healthPercent,
    health_label: snapshot.healthLabel,
    ready_count: snapshot.ready,
    published_count: snapshot.published,
    pending_count: snapshot.pending,
    draft_count: snapshot.draft,
    hidden_count: snapshot.hidden,
    unpublished_count: snapshot.unpublished,
    supplier_issues: snapshot.supplierIssues,
    shipping_issues: snapshot.shippingIssues,
    video_missing: snapshot.videoMissing,
    duplicate_count: snapshot.duplicateCount,
    ready_percent: snapshot.readyPercent,
    publish_percent: snapshot.publishPercent,
    duplicate_rate: snapshot.duplicateRate,
    avg_supplier_quality: snapshot.avgSupplierQuality,
    marketplace_health: snapshot.marketplaceHealth,
  });

  return snapshot;
}

export async function getLatestCatalogHealth(): Promise<CatalogHealthSnapshot | null> {
  const db = getCatalogDB();
  const { data } = await db
    .from("cj_catalog_health")
    .select("*")
    .order("snapshot_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  return {
    healthPercent: Number(data.health_percent),
    healthLabel: data.health_label,
    ready: data.ready_count,
    published: data.published_count,
    pending: data.pending_count,
    draft: data.draft_count,
    hidden: data.hidden_count,
    unpublished: data.unpublished_count,
    supplierIssues: data.supplier_issues,
    shippingIssues: data.shipping_issues,
    videoMissing: data.video_missing,
    duplicateCount: data.duplicate_count,
    readyPercent: Number(data.ready_percent),
    publishPercent: Number(data.publish_percent),
    duplicateRate: Number(data.duplicate_rate),
    avgSupplierQuality: Number(data.avg_supplier_quality),
    marketplaceHealth: Number(data.marketplace_health),
    snapshotAt: data.snapshot_at,
  };
}
