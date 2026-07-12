import {
  publishProductSystem,
  verifyPublishedProduct,
  AUTO_PUBLISH_MAX_RETRIES,
  AUTO_PUBLISH_RETRY_DELAYS_MS,
} from "./system-publish";
import { enrichProduct } from "../import-intelligence/filters";
import type { EnrichedProduct } from "../import-intelligence/types";
import { logAutoPublishEvent, resultToEventInput } from "./auto-publish-events";
import { getCatalogDB } from "./db";
import { rawRowToCJProduct } from "./map-to-cj-product";
import { updateIntelligence } from "./catalog-repository";
import { evaluateV3Intelligence, toV3DbPayload } from "./v3-pipeline";
import { scoreEnrichedProduct } from "./score-product";
import type { CatalogTier } from "../import-intelligence/types";
import { ensureCjProductImported } from "./system-import";

export interface QueueProcessResult {
  processed: number;
  published: number;
  failed: number;
  skipped: number;
  verified: number;
}

export async function enqueueAutoPublish(
  pid: string,
  productId?: string,
  priority?: number,
  debounceMs?: number
): Promise<boolean> {
  const db = getCatalogDB();
  const nextAttempt = new Date(
    Date.now() + (debounceMs ?? 0)
  ).toISOString();

  const { data: existing } = await db
    .from("cj_auto_publish_queue")
    .select("id, status, next_attempt_at, product_id")
    .eq("pid", pid)
    .in("status", ["pending", "processing", "failed"])
    .maybeSingle();

  if (existing) {
    const sooner =
      debounceMs != null &&
      new Date(existing.next_attempt_at as string).getTime() > Date.now() + debounceMs;
    const needsProductId = Boolean(productId && !existing.product_id);
    if (existing.status === "failed" || sooner || needsProductId) {
      const updatePayload: Record<string, unknown> = {
        status: "pending",
        priority: priority ?? 0,
        next_attempt_at: nextAttempt,
        updated_at: new Date().toISOString(),
      };
      if (productId) updatePayload.product_id = productId;
      await db
        .from("cj_auto_publish_queue")
        .update(updatePayload)
        .eq("id", existing.id);
    }
    return true;
  }

  const { error } = await db.from("cj_auto_publish_queue").insert({
    pid,
    product_id: productId ?? null,
    status: "pending",
    priority: priority ?? 0,
    next_attempt_at: nextAttempt,
  });

  return !error;
}

export async function queueReadyProductsFromIntel(limit = 200): Promise<number> {
  const db = getCatalogDB();
  const { computePublishDebounceMs } = await import("./system-publish");
  const debounceMs = computePublishDebounceMs();

  const { data: readyIntel } = await db
    .from("cj_product_intelligence")
    .select("pid, publish_priority, linked_product_id")
    .eq("auto_publish_ready", true)
    .eq("auto_publish_status", "READY")
    .eq("enrichment_status", "complete")
    .or("duplicate_blocked.is.null,duplicate_blocked.eq.false")
    .order("publish_priority", { ascending: false })
    .limit(limit);

  if (!readyIntel?.length) return 0;

  const pids = readyIntel.map((r) => r.pid as string);
  const needsMap = readyIntel
    .filter((r) => !r.linked_product_id)
    .map((r) => r.pid as string);

  const productIdByPid = new Map<string, string>();
  for (const row of readyIntel) {
    if (row.linked_product_id) {
      productIdByPid.set(row.pid as string, row.linked_product_id as string);
    }
  }

  if (needsMap.length > 0) {
    const { data: mapRows } = await db
      .from("cj_product_map")
      .select("cj_pid, product_id")
      .in("cj_pid", needsMap);
    for (const row of mapRows ?? []) {
      if (row.cj_pid && row.product_id) {
        productIdByPid.set(row.cj_pid as string, row.product_id as string);
      }
    }
  }

  const productIds = [...new Set(productIdByPid.values())];
  const productById = new Map<
    string,
    { status: string; is_active: boolean; published_by_admin_override: boolean }
  >();

  if (productIds.length > 0) {
    const { data: products } = await db
      .from("products")
      .select("id, status, is_active, published_by_admin_override")
      .in("id", productIds);
    for (const p of products ?? []) {
      productById.set(p.id as string, {
        status: p.status as string,
        is_active: Boolean(p.is_active),
        published_by_admin_override: Boolean(p.published_by_admin_override),
      });
    }
  }

  let queued = 0;
  for (const row of readyIntel) {
    const pid = row.pid as string;
    let productId = productIdByPid.get(pid) ?? null;

    if (!productId) {
      productId = await ensureCjProductImported(pid);
    }
    if (!productId) continue;

    let product = productById.get(productId);
    if (!product) {
      const { data: fresh } = await db
        .from("products")
        .select("id, status, is_active, published_by_admin_override")
        .eq("id", productId)
        .maybeSingle();
      if (fresh) {
        product = {
          status: fresh.status as string,
          is_active: Boolean(fresh.is_active),
          published_by_admin_override: Boolean(fresh.published_by_admin_override),
        };
      }
    }
    if (!product) continue;
    if (product.published_by_admin_override) continue;
    if (product.status === "active" && product.is_active) continue;

    const priority = Number(row.publish_priority) || 0;
    const ok = await enqueueAutoPublish(pid, productId, priority, debounceMs);
    if (ok) queued += 1;
  }

  return queued;
}

export async function enqueueAutoPublishBatch(
  items: Array<{ pid: string; productId?: string; priority?: number; debounceMs?: number }>
): Promise<number> {
  if (items.length === 0) return 0;

  const sorted = [...items].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  let enqueued = 0;
  for (const item of sorted) {
    const ok = await enqueueAutoPublish(
      item.pid,
      item.productId,
      item.priority,
      item.debounceMs
    );
    if (ok) enqueued += 1;
  }
  return enqueued;
}

async function loadProductForPublish(
  pid: string,
  productId: string
): Promise<EnrichedProduct | null> {
  const db = getCatalogDB();

  const [{ data: intel }, { data: raw }] = await Promise.all([
    db.from("cj_product_intelligence").select("*").eq("pid", pid).maybeSingle(),
    db.from("cj_raw_products").select("*").eq("pid", pid).maybeSingle(),
  ]);

  if (!raw) return null;

  const cj = rawRowToCJProduct(raw, intel);
  const enriched = enrichProduct(cj, {
    [pid]: { productId, name: raw.title },
  });

  if (intel) {
    enriched.intelligence.enrichmentStatus = intel.enrichment_status;
    enriched.intelligence.trending = intel.trending;
  }

  return enriched;
}

/** Auto-published products — Premium → PREMIUM; Standard → STANDARD minimum. */
async function promoteMarketplaceTier(
  pid: string,
  product: EnrichedProduct,
  publishTier?: string | null
): Promise<CatalogTier> {
  const scored = scoreEnrichedProduct(product, "complete");
  let tier = scored.catalogTier;

  if (publishTier === "standard") {
    if (tier !== "ELITE" && tier !== "PREMIUM" && tier !== "STANDARD") {
      tier = "STANDARD";
    }
  } else if (tier !== "ELITE" && tier !== "PREMIUM") {
    tier = "PREMIUM";
  }

  await updateIntelligence(pid, {
    catalog_tier: tier,
    health_score: scored.qualityScores.healthScore,
    opportunity_score: scored.opportunityScore,
    confidence_score: scored.confidenceScore,
    badges: scored.badges,
    quality_scores: scored.qualityScores as unknown as Record<string, number>,
    trending: scored.trending,
  });

  return tier;
}

export async function processAutoPublishQueue(
  limit = 25
): Promise<QueueProcessResult> {
  const db = getCatalogDB();
  const batchId = crypto.randomUUID();
  const result: QueueProcessResult = {
    processed: 0,
    published: 0,
    failed: 0,
    skipped: 0,
    verified: 0,
  };

  const { data: jobs, error } = await db
    .from("cj_auto_publish_queue")
    .select("*")
    .in("status", ["pending", "failed"])
    .lte("next_attempt_at", new Date().toISOString())
    .order("priority", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error || !jobs?.length) return result;

  for (const job of jobs) {
    const start = Date.now();
    const pid = job.pid as string;
    let resolvedProductId = job.product_id as string | null;

    await db
      .from("cj_auto_publish_queue")
      .update({
        status: "processing",
        batch_id: batchId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.id);

    result.processed += 1;

    if (!resolvedProductId) {
      resolvedProductId = await ensureCjProductImported(pid);
      if (resolvedProductId) {
        await db
          .from("cj_auto_publish_queue")
          .update({ product_id: resolvedProductId })
          .eq("id", job.id);
      }
    }

    if (!resolvedProductId) {
      result.skipped += 1;
      await db
        .from("cj_auto_publish_queue")
        .update({
          status: "failed",
          last_error: "No product_id — import required",
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id);
      continue;
    }

    const productId = resolvedProductId;

    try {
      const { data: currentProduct } = await db
        .from("products")
        .select("status, is_active, published_by_admin_override")
        .eq("id", productId)
        .maybeSingle();

      if (
        currentProduct?.status === "active" &&
        currentProduct?.is_active &&
        !currentProduct?.published_by_admin_override
      ) {
        result.skipped += 1;
        await db
          .from("cj_auto_publish_queue")
          .update({
            status: "complete",
            last_error: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", job.id);
        continue;
      }

      const product = await loadProductForPublish(pid, resolvedProductId);
      if (!product) throw new Error("Product data not found");

      const v3 = evaluateV3Intelligence(product);
      await updateIntelligence(pid, toV3DbPayload(v3));

      if (v3.blocked) {
        result.skipped += 1;
        await db
          .from("cj_auto_publish_queue")
          .update({
            status: "complete",
            last_error: v3.blockReasons.join(", "),
            updated_at: new Date().toISOString(),
          })
          .eq("id", job.id);

        await logAutoPublishEvent({
          pid,
          productId,
          supplier: product.supplierName,
          published: false,
          failureReasons: v3.blockReasons,
          processingTimeMs: Date.now() - start,
          eventType: v3.duplicate ? "duplicate_blocked" : "queue_failed",
        });
        continue;
      }

      if (!v3.publishReady) {
        result.skipped += 1;
        await db
          .from("cj_auto_publish_queue")
          .update({
            status: "complete",
            last_error: v3.autoPublish.failures.join(", ") || "Not ready",
            updated_at: new Date().toISOString(),
          })
          .eq("id", job.id);

        await logAutoPublishEvent(
          resultToEventInput(v3.autoPublish, {
            pid,
            productId,
            supplier: product.supplierName,
            published: false,
            processingTimeMs: Date.now() - start,
            eventType: "queue_failed",
          })
        );
        continue;
      }

      await logAutoPublishEvent({
        pid,
        productId,
        supplier: product.supplierName,
        ready: true,
        published: false,
        score: v3.autoPublish.score,
        status: v3.autoPublish.status,
        processingTimeMs: Date.now() - start,
        eventType: "publishing",
      });

      await promoteMarketplaceTier(pid, product, v3.publishTier);

      const pub = await publishProductSystem(productId);
      if (!pub.success) throw new Error(pub.error ?? "Publish failed");

      const verification = await verifyPublishedProduct(productId);
      if (!verification.verified) {
        throw new Error(
          `Post-publish verification failed: ${verification.errors.join(", ")}`
        );
      }

      result.published += 1;
      result.verified += 1;

      await db
        .from("cj_auto_publish_queue")
        .update({
          status: "complete",
          last_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id);

      await logAutoPublishEvent(
        resultToEventInput(v3.autoPublish, {
          pid,
          productId,
          supplier: product.supplierName,
          published: true,
          processingTimeMs: Date.now() - start,
          eventType: "auto_published",
        })
      );

      await logAutoPublishEvent({
        pid,
        productId,
        published: true,
        processingTimeMs: Date.now() - start,
        eventType: "verified",
        failureReasons: [],
        status: JSON.stringify(verification.checks),
      });

      await db
        .from("cj_product_intelligence")
        .update({
          linked_product_id: productId,
          is_published_active: true,
          is_admin_override: false,
          updated_at: new Date().toISOString(),
        })
        .eq("pid", pid);
    } catch (err) {
      result.failed += 1;
      const attempts = (job.attempts as number) + 1;
      const message = err instanceof Error ? err.message : "Queue publish failed";
      const isDead = attempts >= AUTO_PUBLISH_MAX_RETRIES;
      const delay =
        AUTO_PUBLISH_RETRY_DELAYS_MS[
          Math.min(attempts - 1, AUTO_PUBLISH_RETRY_DELAYS_MS.length - 1)
        ];

      await db
        .from("cj_auto_publish_queue")
        .update({
          status: isDead ? "dead_letter" : "failed",
          attempts,
          last_error: message,
          next_attempt_at: isDead
            ? new Date().toISOString()
            : new Date(Date.now() + delay).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id);

      await logAutoPublishEvent({
        pid,
        productId: productId ?? undefined,
        published: false,
        failureReasons: [message],
        processingTimeMs: Date.now() - start,
        eventType: isDead ? "queue_failed" : "retry",
      });
    }
  }

  return result;
}
