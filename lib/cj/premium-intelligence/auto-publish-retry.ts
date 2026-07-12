import {
  evaluateV3Intelligence,
  toV3DbPayload,
} from "./v3-pipeline";
import { enrichProduct } from "../import-intelligence/filters";
import { enqueueAutoPublishBatch } from "./auto-publish-queue";
import { getCatalogDB } from "./db";
import { rawRowToCJProduct } from "./map-to-cj-product";
import { updateIntelligence, startSyncRun, finishSyncRun } from "./catalog-repository";
import { processAutoPublishQueue } from "./auto-publish-queue";
import { computePublishPriority } from "./smart-queue-priority";
import { computePublishDebounceMs } from "./system-publish";

const REEVAL_BATCH = 500;

export interface AutoPublishRetryResult {
  reevaluated: number;
  newlyReady: number;
  enqueued: number;
  queue: Awaited<ReturnType<typeof processAutoPublishQueue>>;
}

/** Re-evaluate draft/pending products and queue ready ones for batched publish */
export async function runAutoPublishRetry(): Promise<AutoPublishRetryResult> {
  const runId = await startSyncRun("score_recalc");
  const db = getCatalogDB();
  const result: AutoPublishRetryResult = {
    reevaluated: 0,
    newlyReady: 0,
    enqueued: 0,
    queue: { processed: 0, published: 0, failed: 0, skipped: 0, verified: 0 },
  };

  try {
    const { data: draftProducts, error } = await db
      .from("products")
      .select("id, source_metadata, status")
      .eq("source", "cj")
      .eq("status", "draft")
      .eq("published_by_admin_override", false)
      .eq("auto_unpublished", false)
      .is("deleted_at", null)
      .limit(REEVAL_BATCH);

    if (error) throw new Error(error.message);

    const toEnqueue: Array<{ pid: string; productId: string; priority: number }> = [];

    for (const row of draftProducts ?? []) {
      const meta = row.source_metadata as Record<string, unknown> | null;
      const pid = typeof meta?.cj_pid === "string" ? meta.cj_pid : null;
      if (!pid) continue;

      const [{ data: intel }, { data: raw }] = await Promise.all([
        db.from("cj_product_intelligence").select("*").eq("pid", pid).maybeSingle(),
        db.from("cj_raw_products").select("*").eq("pid", pid).maybeSingle(),
      ]);

      if (!raw) continue;

      const cj = rawRowToCJProduct(raw, intel);
      const enriched = enrichProduct(cj, {
        [pid]: { productId: row.id as string },
      });

      if (intel) {
        enriched.intelligence.enrichmentStatus = intel.enrichment_status;
        enriched.intelligence.trending = intel.trending;
      }

      const v3 = evaluateV3Intelligence(enriched);
      await updateIntelligence(pid, toV3DbPayload(v3));
      result.reevaluated += 1;

      if (v3.publishReady && !v3.blocked) {
        result.newlyReady += 1;
        toEnqueue.push({
          pid,
          productId: row.id as string,
          priority: v3.publishPriority || computePublishPriority(enriched),
        });
      }
    }

    result.enqueued = await enqueueAutoPublishBatch(
      toEnqueue.map((item) => ({
        ...item,
        debounceMs: computePublishDebounceMs(),
      }))
    );
    result.queue = await processAutoPublishQueue(25);

    await finishSyncRun(runId, {
      status: "success",
      total_saved: result.reevaluated,
      metadata: {
        newlyReady: result.newlyReady,
        enqueued: result.enqueued,
        published: result.queue.published,
      },
    });
  } catch (err) {
    await finishSyncRun(runId, {
      status: "failed",
      error_message: err instanceof Error ? err.message : "retry failed",
    });
    throw err;
  }

  return result;
}
