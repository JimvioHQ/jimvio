/**
 * Marketplace Restore — recover products incorrectly hidden by aggressive auto-publish rules.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { enrichProduct } from "../import-intelligence/filters";
import type { EnrichedProduct } from "../import-intelligence/types";
import {
  isPermanentUnpublishReason,
  evaluateProgressivePublish,
  type PublishTier,
} from "../import-intelligence/progressive-publish";
import { hasStockAvailable } from "../import-intelligence/auto-publish-engine";
import { getCatalogDB } from "./db";
import { getBlacklistedSupplierIds } from "./supplier-reputation-engine";
import { rawRowToCJProduct } from "./map-to-cj-product";
import { invalidateCatalogCache } from "./catalog-cache";
import { computeAutoPublishAnalytics } from "./auto-publish-analytics";
import { computeCatalogFilterCounts } from "./catalog-filter-index";
import { refreshSearchIndexBatch } from "./search-index";
import { logAutoPublishEvent } from "./auto-publish-events";

const RESTORE_BATCH = 200;

export interface MarketplaceRestoreResult {
  scanned: number;
  restored: number;
  skipped: number;
  intelligenceFixed: number;
  errors: number;
  durationMs: number;
}

async function restoreProduct(
  productId: string,
  pid: string,
  publishTier: PublishTier
): Promise<boolean> {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const catalogTier =
    publishTier === "premium" ? "PREMIUM" : publishTier === "standard" ? "STANDARD" : "STANDARD";

  const { error } = await admin
    .from("products")
    .update({
      status: "active",
      is_active: true,
      auto_unpublished: false,
      auto_unpublish_reason: null,
      auto_unpublished_at: null,
      updated_at: now,
    })
    .eq("id", productId);

  if (error) return false;

  const db = getCatalogDB();
  await db
    .from("cj_product_intelligence")
    .update({
      auto_publish_ready: true,
      auto_publish_status: "READY",
      is_published_active: true,
      linked_product_id: productId,
      catalog_tier: catalogTier,
      auto_unpublish_reason: null,
      publish_tier: publishTier,
      last_auto_publish_check: now,
      updated_at: now,
    })
    .eq("pid", pid);

  await logAutoPublishEvent({
    pid,
    productId,
    published: true,
    eventType: "auto_published",
    failureReasons: ["Restored from aggressive auto-unpublish"],
  });

  return true;
}

async function fixLiveProductIntelligence(
  productId: string,
  pid: string,
  publishTier: PublishTier
): Promise<void> {
  const db = getCatalogDB();
  const catalogTier =
    publishTier === "premium" ? "PREMIUM" : publishTier === "standard" ? "STANDARD" : "STANDARD";
  await db
    .from("cj_product_intelligence")
    .update({
      auto_publish_ready: true,
      auto_publish_status: "READY",
      is_published_active: true,
      linked_product_id: productId,
      catalog_tier: catalogTier,
      publish_tier: publishTier,
      updated_at: new Date().toISOString(),
    })
    .eq("pid", pid);
}

/** Fix intelligence rows for live products incorrectly marked not-ready by scans. */
export async function fixMisalignedLiveIntelligence(
  limit = RESTORE_BATCH
): Promise<{ scanned: number; fixed: number }> {
  const db = getCatalogDB();
  const admin = createAdminClient();
  const blacklisted = await getBlacklistedSupplierIds();
  const result = { scanned: 0, fixed: 0 };

  const { data: liveProducts } = await admin
    .from("products")
    .select("id, source_metadata, auto_unpublished")
    .eq("source", "cj")
    .eq("status", "active")
    .eq("is_active", true)
    .eq("auto_unpublished", false)
    .is("deleted_at", null)
    .limit(limit);

  for (const row of liveProducts ?? []) {
    result.scanned += 1;
    const productId = row.id as string;
    const meta = row.source_metadata as Record<string, unknown> | null;
    const pid = typeof meta?.cj_pid === "string" ? meta.cj_pid : null;
    if (!pid) continue;

    const { data: intel } = await db
      .from("cj_product_intelligence")
      .select("*")
      .eq("pid", pid)
      .maybeSingle();

    if (!intel) continue;
    if (intel.auto_publish_ready && intel.is_published_active) continue;

    const { data: raw } = await db
      .from("cj_raw_products")
      .select("*")
      .eq("pid", pid)
      .maybeSingle();
    if (!raw) continue;

    const cj = rawRowToCJProduct(raw, intel);
    const enriched = enrichProduct(cj, { [pid]: { productId } }) as EnrichedProduct;
    if (intel) {
      enriched.intelligence.enrichmentStatus = intel.enrichment_status;
      enriched.intelligence.trending = intel.trending;
    }

    const supplierId = enriched.supplierId ?? enriched.supplierName ?? "";
    if (blacklisted.has(supplierId)) continue;
    if (!hasStockAvailable(enriched)) continue;

    const progressive = evaluateProgressivePublish(enriched);
    if (!progressive.publishReady) continue;

    await fixLiveProductIntelligence(productId, pid, progressive.tier);
    result.fixed += 1;
  }

  return result;
}

/**
 * Restore products auto-unpublished ONLY due to aggressive rules.
 * Skips: CJ removed, zero stock, blacklisted supplier.
 */
export async function restoreAggressiveUnpublishes(
  limit = RESTORE_BATCH
): Promise<MarketplaceRestoreResult> {
  const start = Date.now();
  const result: MarketplaceRestoreResult = {
    scanned: 0,
    restored: 0,
    skipped: 0,
    intelligenceFixed: 0,
    errors: 0,
    durationMs: 0,
  };

  const db = getCatalogDB();
  const admin = createAdminClient();
  const blacklisted = await getBlacklistedSupplierIds();

  const { data: candidates } = await admin
    .from("products")
    .select("id, status, is_active, source_metadata, auto_unpublish_reason, auto_unpublished")
    .eq("source", "cj")
    .is("deleted_at", null)
    .or("auto_unpublished.eq.true,and(status.eq.draft,auto_unpublish_reason.not.is.null)")
    .limit(limit);

  for (const row of candidates ?? []) {
    result.scanned += 1;
    const productId = row.id as string;
    const meta = row.source_metadata as Record<string, unknown> | null;
    const pid = typeof meta?.cj_pid === "string" ? meta.cj_pid : null;
    const reason = (row.auto_unpublish_reason as string) ?? null;

    if (!pid) {
      result.skipped += 1;
      continue;
    }

    if (isPermanentUnpublishReason(reason)) {
      result.skipped += 1;
      continue;
    }

    const [{ data: raw }, { data: intel }] = await Promise.all([
      db.from("cj_raw_products").select("*").eq("pid", pid).maybeSingle(),
      db.from("cj_product_intelligence").select("*").eq("pid", pid).maybeSingle(),
    ]);

    if (!raw) {
      result.skipped += 1;
      continue;
    }

    const cj = rawRowToCJProduct(raw, intel);
    const enriched = enrichProduct(cj, { [pid]: { productId } }) as EnrichedProduct;
    if (intel) {
      enriched.intelligence.enrichmentStatus = intel.enrichment_status;
      enriched.intelligence.trending = intel.trending;
    }

    const supplierId = enriched.supplierId ?? enriched.supplierName ?? "";
    if (blacklisted.has(supplierId)) {
      result.skipped += 1;
      continue;
    }

    if (!hasStockAvailable(enriched)) {
      result.skipped += 1;
      continue;
    }

    const progressive = evaluateProgressivePublish(enriched);
    if (!progressive.publishReady) {
      result.skipped += 1;
      continue;
    }

    const isAlreadyLive =
      row.status === "active" && row.is_active === true && !row.auto_unpublished;

    try {
      if (isAlreadyLive) {
        await fixLiveProductIntelligence(productId, pid, progressive.tier);
        result.intelligenceFixed += 1;
      } else {
        const ok = await restoreProduct(productId, pid, progressive.tier);
        if (ok) result.restored += 1;
        else result.errors += 1;
      }
    } catch {
      result.errors += 1;
    }
  }

  result.durationMs = Date.now() - start;
  return result;
}

/** Full marketplace recovery: restore + rebuild indexes and analytics. */
export async function runMarketplaceRecovery(): Promise<{
  restore: MarketplaceRestoreResult;
  searchIndexed: number;
  analyticsRefreshed: boolean;
  filtersRefreshed: boolean;
}> {
  const restore = await restoreAggressiveUnpublishes(500);
  const misaligned = await fixMisalignedLiveIntelligence(500);
  restore.intelligenceFixed += misaligned.fixed;

  const indexBatch = await refreshSearchIndexBatch("", 500);

  let analyticsRefreshed = false;
  let filtersRefreshed = false;

  try {
    await computeAutoPublishAnalytics();
    analyticsRefreshed = true;
  } catch {
    // optional
  }

  try {
    await computeCatalogFilterCounts();
    filtersRefreshed = true;
  } catch {
    // optional
  }

  invalidateCatalogCache();

  await logAutoPublishEvent({
    eventType: "catalog_cleanup",
    failureReasons: [
      `Marketplace restore: ${restore.restored} products restored`,
      `Intelligence fixed: ${restore.intelligenceFixed}`,
    ],
  });

  return {
    restore,
    searchIndexed: indexBatch.indexed,
    analyticsRefreshed,
    filtersRefreshed,
  };
}
