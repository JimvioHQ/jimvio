/**
 * Auto Publish Trigger — queue products for autonomous publish after becoming READY.
 */

import { enrichProduct } from "../import-intelligence/filters";
import type { EnrichedProduct } from "../import-intelligence/types";
import { enqueueAutoPublish } from "./auto-publish-queue";
import { logAutoPublishEvent } from "./auto-publish-events";
import { getCatalogDB } from "./db";
import { rawRowToCJProduct } from "./map-to-cj-product";
import { updateIntelligence } from "./catalog-repository";
import { evaluateV3Intelligence, toV3DbPayload } from "./v3-pipeline";
import { computePublishPriority } from "./smart-queue-priority";
import { computePublishDebounceMs } from "./system-publish";
import type { CjProductIntelligenceRow } from "./types";

export type TriggerReason =
  | "enrichment_complete"
  | "video_change"
  | "supplier_change"
  | "stock_change"
  | "images_change"
  | "description_change"
  | "shipping_change"
  | "trending_change"
  | "signal_recalc"
  | "worker_scan";

export interface TriggerResult {
  pid: string;
  productId: string | null;
  ready: boolean;
  blocked: boolean;
  queued: boolean;
  reason: TriggerReason;
}

async function resolveProductId(pid: string): Promise<string | null> {
  const db = getCatalogDB();

  const { data: mapped } = await db
    .from("cj_product_map")
    .select("product_id")
    .eq("cj_pid", pid)
    .maybeSingle();

  if (mapped?.product_id) return mapped.product_id as string;

  const { data: byMeta } = await db
    .from("products")
    .select("id")
    .eq("source", "cj")
    .contains("source_metadata", { cj_pid: pid })
    .is("deleted_at", null)
    .maybeSingle();

  return (byMeta?.id as string) ?? null;
}

async function loadEnrichedProduct(
  pid: string,
  productId?: string | null
): Promise<EnrichedProduct | null> {
  const db = getCatalogDB();
  const [{ data: intel }, { data: raw }] = await Promise.all([
    db.from("cj_product_intelligence").select("*").eq("pid", pid).maybeSingle(),
    db.from("cj_raw_products").select("*").eq("pid", pid).maybeSingle(),
  ]);

  if (!raw) return null;

  const cj = rawRowToCJProduct(raw, intel);
  const enriched = enrichProduct(cj, productId ? { [pid]: { productId } } : {});

  if (intel) {
    enriched.intelligence.enrichmentStatus = intel.enrichment_status;
    enriched.intelligence.trending = intel.trending;
  }

  return enriched;
}

/**
 * Re-evaluate Auto Publish and queue with debounce if READY.
 * Scan mode preserves visibility for already-live published products.
 */
export async function triggerAutoPublishEvaluation(
  pid: string,
  reason: TriggerReason,
  options?: { scanOnly?: boolean }
): Promise<TriggerResult> {
  const productId = await resolveProductId(pid);
  const product = await loadEnrichedProduct(pid, productId);

  const result: TriggerResult = {
    pid,
    productId,
    ready: false,
    blocked: false,
    queued: false,
    reason,
  };

  if (!product) return result;

  const db = getCatalogDB();
  let isLivePublished = false;

  if (productId) {
    const { data: existingProduct } = await db
      .from("products")
      .select("status, is_active, published_by_admin_override, auto_unpublished")
      .eq("id", productId)
      .maybeSingle();

    isLivePublished = Boolean(
      existingProduct?.status === "active" &&
        existingProduct?.is_active &&
        !existingProduct?.auto_unpublished
    );
  }

  const v3 = evaluateV3Intelligence(product);
  let payload: Partial<CjProductIntelligenceRow> = {
    ...toV3DbPayload(v3),
    ...(v3.publishReady && !v3.blocked
      ? { auto_publish_ready_at: new Date().toISOString() }
      : {}),
  };

  if (isLivePublished && !v3.blocked) {
    payload = {
      ...payload,
      auto_publish_ready: true,
      auto_publish_status: "READY",
      is_published_active: true,
      linked_product_id: productId,
    };
  }

  await updateIntelligence(pid, payload);

  result.ready = v3.publishReady;
  result.blocked = v3.blocked;

  if (!productId) return result;
  if (v3.blocked || !v3.publishReady) return result;

  const { data: existingProduct } = await db
    .from("products")
    .select("status, is_active, published_by_admin_override")
    .eq("id", productId)
    .maybeSingle();

  if (!existingProduct) return result;
  if (existingProduct.published_by_admin_override) return result;
  if (existingProduct.status === "active" && existingProduct.is_active) {
    return result;
  }

  const priority = v3.publishPriority || computePublishPriority(product);
  const debounceMs = computePublishDebounceMs();
  const queued = await enqueueAutoPublish(pid, productId, priority, debounceMs);

  result.queued = queued;

  if (queued) {
    await logAutoPublishEvent({
      pid,
      productId,
      supplier: product.supplierName,
      ready: true,
      published: false,
      score: v3.autoPublish.score,
      status: "READY",
      processingTimeMs: debounceMs,
      eventType: "queued",
    });

    const { invalidateCatalogCache } = await import("./catalog-cache");
    invalidateCatalogCache();

    const { processAutoPublishQueue } = await import("./auto-publish-queue");
    void processAutoPublishQueue(10).catch(() => {});
  }

  return result;
}

export async function triggerAutoPublishBatch(
  pids: string[],
  reason: TriggerReason
): Promise<{ triggered: number; queued: number }> {
  let triggered = 0;
  let queued = 0;

  for (const pid of pids) {
    const r = await triggerAutoPublishEvaluation(pid, reason);
    triggered += 1;
    if (r.queued) queued += 1;
  }

  return { triggered, queued };
}
