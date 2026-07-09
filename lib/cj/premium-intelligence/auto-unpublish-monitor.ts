/**
 * Auto Unpublish Monitor v3 — scans published CJ products; metadata-only updates.
 * Does NOT remove, archive, or draft marketplace products (hotfix: no automatic hiding).
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

/** Record availability signals on intelligence only — never hide live marketplace rows. */
async function recordAvailabilitySignal(
  productId: string,
  reason: string,
  pid?: string
): Promise<boolean> {
  const admin = createAdminClient();
  const now = new Date().toISOString();

  if (pid) {
    const db = getCatalogDB();
    await db
      .from("cj_product_intelligence")
      .update({
        auto_unpublish_reason: reason,
        last_auto_publish_check: now,
        updated_at: now,
      })
      .eq("pid", pid);
  }

  const { data: existing } = await admin
    .from("products")
    .select("source_metadata")
    .eq("id", productId)
    .maybeSingle();

  const meta = (existing?.source_metadata as Record<string, unknown> | null) ?? {};
  await admin
    .from("products")
    .update({
      source_metadata: {
        ...meta,
        cj_availability_note: reason,
        cj_availability_checked_at: now,
      },
      updated_at: now,
    })
    .eq("id", productId);

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
      const reason = "Product removed from CJ";
      await recordAvailabilitySignal(row.id as string, reason, pid);
      result.reasons[reason] = (result.reasons[reason] ?? 0) + 1;
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
    });

    if (!evaluation.shouldUnpublish) continue;

    const reason = evaluation.reasons[0] ?? "Stock became zero";
    await recordAvailabilitySignal(row.id as string, reason, pid);
    for (const r of evaluation.reasons) {
      result.reasons[r] = (result.reasons[r] ?? 0) + 1;
    }
  }

  return result;
}
