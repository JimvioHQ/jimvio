/**
 * Auto Publish Worker — runs every 2 minutes.
 * Finds READY draft products, processes debounced queue, publishes autonomously.
 */

import { getCatalogDB } from "./db";
import { processAutoPublishQueue } from "./auto-publish-queue";
import { triggerAutoPublishEvaluation } from "./auto-publish-trigger";
import { runCatalogScannerBatch } from "./catalog-scanner";
import {
  AUTO_PUBLISH_WORKER_BATCH_SIZE,
  verifyPublishedProduct,
} from "./system-publish";

export interface AutoPublishWorkerResult {
  scanned: number;
  newlyQueued: number;
  scanner: {
    evaluated: number;
    queued: number;
    cycleComplete: boolean;
    totalScanned: number;
  };
  queue: {
    processed: number;
    published: number;
    failed: number;
    skipped: number;
    verified: number;
  };
  durationMs: number;
}

async function isAutoPublishSchemaReady(): Promise<boolean> {
  try {
    const db = getCatalogDB();
    const { error } = await db.from("cj_auto_publish_queue").select("id").limit(1);
    return !error;
  } catch {
    return false;
  }
}

/**
 * Scan for imported draft products that are READY but not yet queued.
 */
async function scanAndQueueReadyProducts(limit = 200): Promise<number> {
  const db = getCatalogDB();
  let queued = 0;

  const { data: readyIntel } = await db
    .from("cj_product_intelligence")
    .select("pid")
    .eq("auto_publish_ready", true)
    .eq("auto_publish_status", "READY")
    .eq("enrichment_status", "complete")
    .or("duplicate_blocked.is.null,duplicate_blocked.eq.false")
    .limit(limit);

  for (const row of readyIntel ?? []) {
    const pid = row.pid as string;
    const result = await triggerAutoPublishEvaluation(pid, "worker_scan");
    if (result.queued) queued += 1;
  }

  return queued;
}

export async function runAutoPublishWorker(): Promise<AutoPublishWorkerResult> {
  const start = Date.now();
  const result: AutoPublishWorkerResult = {
    scanned: 0,
    newlyQueued: 0,
    scanner: {
      evaluated: 0,
      queued: 0,
      cycleComplete: false,
      totalScanned: 0,
    },
    queue: {
      processed: 0,
      published: 0,
      failed: 0,
      skipped: 0,
      verified: 0,
    },
    durationMs: 0,
  };

  const schemaReady = await isAutoPublishSchemaReady();
  if (!schemaReady) {
    result.durationMs = Date.now() - start;
    return result;
  }

  result.newlyQueued = await scanAndQueueReadyProducts();
  result.scanned = result.newlyQueued;

  const scannerResult = await runCatalogScannerBatch(200);
  result.scanner = {
    evaluated: scannerResult.evaluated,
    queued: scannerResult.queued,
    cycleComplete: scannerResult.cycleComplete,
    totalScanned: scannerResult.totalScanned,
  };

  const queueResult = await processAutoPublishQueue(AUTO_PUBLISH_WORKER_BATCH_SIZE);
  result.queue.processed = queueResult.processed;
  result.queue.published = queueResult.published;
  result.queue.failed = queueResult.failed;
  result.queue.skipped = queueResult.skipped;
  result.queue.verified = queueResult.verified ?? 0;

  result.durationMs = Date.now() - start;
  return result;
}

export async function triggerAutoPublishFromWorker(options?: {
  processQueueOnly?: boolean;
}): Promise<{ published: number; verified: number }> {
  if (!options?.processQueueOnly) {
    await scanAndQueueReadyProducts(50);
  }

  const queueResult = await processAutoPublishQueue(AUTO_PUBLISH_WORKER_BATCH_SIZE);
  return {
    published: queueResult.published,
    verified: queueResult.verified ?? 0,
  };
}

export { verifyPublishedProduct };
