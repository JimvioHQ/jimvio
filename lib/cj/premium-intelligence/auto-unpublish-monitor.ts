/**
 * Auto Unpublish Monitor v3 — scans published CJ products and unpublishes.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { enrichProduct } from "../import-intelligence/filters";
import type { EnrichedProduct } from "../import-intelligence/types";
import { evaluateUnpublishConditions } from "./auto-unpublish-engine";
import { logAutoPublishEvent } from "./auto-publish-events";
import { getCatalogDB } from "./db";
import { getBlacklistedSupplierIds } from "./supplier-reputation-engine";
import { rawRowToCJProduct } from "./map-to-cj-product";

const BATCH_SIZE = 100;

export interface UnpublishMonitorResult {
  scanned: number;
  unpublished: number;
  reasons: Record<string, number>;
}

async function unpublishProduct(
  productId: string,
  reason: string,
  pid?: string
): Promise<boolean> {
  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { error } = await admin
    .from("products")
    .update({
      status: "draft",
      is_active: false,
      auto_unpublished: true,
      auto_unpublish_reason: reason,
      auto_unpublished_at: now,
      updated_at: now,
    })
    .eq("id", productId);

  if (error) return false;

  if (pid) {
    await admin
      .from("cj_product_intelligence")
      .update({
        auto_publish_ready: false,
        auto_publish_status: "REQUIREMENTS_MISSING",
        auto_unpublish_reason: reason,
        is_published_active: false,
        last_auto_publish_check: now,
      })
      .eq("pid", pid);
  }

  await logAutoPublishEvent({
    pid,
    productId,
    published: false,
    failureReasons: [reason],
    eventType: "unpublished",
  });

  return true;
}

export async function runStockHealthMonitor(): Promise<UnpublishMonitorResult> {
  const db = getCatalogDB();
  const result: UnpublishMonitorResult = {
    scanned: 0,
    unpublished: 0,
    reasons: {},
  };

  const blacklisted = await getBlacklistedSupplierIds();

  const { data: published } = await db
    .from("products")
    .select("id, source_metadata, status")
    .eq("source", "cj")
    .eq("status", "active")
    .eq("published_by_admin_override", false)
    .eq("auto_unpublished", false)
    .is("deleted_at", null)
    .limit(BATCH_SIZE);

  for (const row of published ?? []) {
    result.scanned += 1;
    const meta = row.source_metadata as Record<string, unknown> | null;
    const pid = typeof meta?.cj_pid === "string" ? meta.cj_pid : null;
    if (!pid) continue;

    const [{ data: intel }, { data: raw }] = await Promise.all([
      db.from("cj_product_intelligence").select("*").eq("pid", pid).maybeSingle(),
      db.from("cj_raw_products").select("*").eq("pid", pid).maybeSingle(),
    ]);

    if (!raw) {
      const ok = await unpublishProduct(row.id as string, "Product removed from CJ", pid);
      if (ok) {
        result.unpublished += 1;
        result.reasons["Product removed from CJ"] =
          (result.reasons["Product removed from CJ"] ?? 0) + 1;
      }
      continue;
    }

    const cj = rawRowToCJProduct(raw, intel);
    const enriched = enrichProduct(cj, {
      [pid]: { productId: row.id as string },
    }) as EnrichedProduct;

    if (intel) {
      enriched.intelligence.enrichmentStatus = intel.enrichment_status;
      enriched.intelligence.trending = intel.trending;
    }

    const supplierId = enriched.supplierId ?? enriched.supplierName ?? "";
    const evaluation = evaluateUnpublishConditions(enriched, {
      rawProductExists: true,
      supplierBlacklisted: blacklisted.has(supplierId),
      previouslyHadVideo: intel?.has_video === true,
    });

    if (!evaluation.shouldUnpublish) continue;

    const reason = evaluation.reasons[0] ?? "Quality requirements no longer met";
    const ok = await unpublishProduct(row.id as string, reason, pid);
    if (ok) {
      result.unpublished += 1;
      for (const r of evaluation.reasons) {
        result.reasons[r] = (result.reasons[r] ?? 0) + 1;
      }
    }
  }

  return result;
}
