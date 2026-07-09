/**
 * Autonomous Marketplace Engine v5 — unified 2-minute worker.
 */

import { getCatalogDB } from "./db";
import { processAutoPublishQueue, queueReadyProductsFromIntel } from "./auto-publish-queue";
import { runCatalogScannerBatch } from "./catalog-scanner";
import { runCjWatcherBatch } from "./cj-watcher";
import { processSignalWatchQueue } from "./signal-watch";
import { processEnrichmentQueueChained } from "./process-enrichment-queue";
import {
  AUTO_PUBLISH_WORKER_BATCH_SIZE,
  verifyPublishedProduct,
} from "./system-publish";

export interface AutoPublishWorkerResult {
  scanned: number;
  newlyQueued: number;
  enrichment: { processed: number; succeeded: number; failed: number };
  watcher: {
    watched: number;
    signalsDetected: number;
    enrichmentQueued: number;
    newProducts: number;
  };
  signalWatch: {
    processed: number;
    reevaluated: number;
    queued: number;
    failed: number;
  };
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

async function scanAndQueueReadyProducts(limit = 200): Promise<number> {
  return queueReadyProductsFromIntel(limit);
}

export async function runAutoPublishWorker(): Promise<AutoPublishWorkerResult> {
  const start = Date.now();
  const result: AutoPublishWorkerResult = {
    scanned: 0,
    newlyQueued: 0,
    enrichment: { processed: 0, succeeded: 0, failed: 0 },
    watcher: {
      watched: 0,
      signalsDetected: 0,
      enrichmentQueued: 0,
      newProducts: 0,
    },
    signalWatch: {
      processed: 0,
      reevaluated: 0,
      queued: 0,
      failed: 0,
    },
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

  const queueResult = await processAutoPublishQueue(AUTO_PUBLISH_WORKER_BATCH_SIZE);
  result.queue.processed = queueResult.processed;
  result.queue.published = queueResult.published;
  result.queue.failed = queueResult.failed;
  result.queue.skipped = queueResult.skipped;
  result.queue.verified = queueResult.verified ?? 0;

  result.enrichment = await processEnrichmentQueueChained(50, {
    maxDurationMs: 45_000,
  });

  const signalResult = await processSignalWatchQueue(50);
  result.signalWatch = signalResult;

  const scannerResult = await runCatalogScannerBatch(200);
  result.scanner = {
    evaluated: scannerResult.evaluated,
    queued: scannerResult.queued,
    cycleComplete: scannerResult.cycleComplete,
    totalScanned: scannerResult.totalScanned,
  };

  const watcherResult = await runCjWatcherBatch(100);
  result.watcher = watcherResult;

  const { backfillIntelFilterSignals } = await import("./catalog-repository");
  const { getCached, setCached } = await import("./catalog-cache");
  const offset = getCached<number>("intel-signal-backfill-offset") ?? 0;
  const patched = await backfillIntelFilterSignals(300, offset).catch(() => 0);
  if (patched > 0) {
    setCached("intel-signal-backfill-offset", offset + patched, 86_400_000);
  }

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
