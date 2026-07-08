import {
  finishSyncRun,
  markQueueJob,
  pollEnrichmentJobs,
  startSyncRun,
} from "./catalog-repository";
import { enrichSingleProduct } from "./enrich-product";
import type { EnrichmentBatchResult } from "./types";

const DEFAULT_INTER_JOB_MS = 100;

export async function processEnrichmentQueue(
  limit = 15
): Promise<EnrichmentBatchResult> {
  const runId = await startSyncRun("enrichment");
  const jobs = await pollEnrichmentJobs(limit);

  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  for (const job of jobs) {
    await markQueueJob(job.pid as string, {
      status: "processing",
      updated_at: new Date().toISOString(),
    });

    processed++;
    const ok = await enrichSingleProduct(job.pid as string);
    if (ok) succeeded++;
    else failed++;

    if (DEFAULT_INTER_JOB_MS > 0) {
      await sleep(DEFAULT_INTER_JOB_MS);
    }
  }

  await finishSyncRun(runId, {
    status: failed > 0 && succeeded === 0 ? "failed" : failed > 0 ? "partial" : "success",
    total_fetched: jobs.length,
    total_saved: succeeded,
    total_errors: failed,
  });

  return { processed, succeeded, failed };
}

/**
 * Process enrichment batches back-to-back until the queue is empty or time budget expires.
 */
export async function processEnrichmentQueueChained(
  batchSize = 25,
  options?: { maxDurationMs?: number }
): Promise<EnrichmentBatchResult> {
  const maxDuration = options?.maxDurationMs ?? 90_000;
  const start = Date.now();
  const total: EnrichmentBatchResult = { processed: 0, succeeded: 0, failed: 0 };

  while (Date.now() - start < maxDuration) {
    const batch = await processEnrichmentQueue(batchSize);
    total.processed += batch.processed;
    total.succeeded += batch.succeeded;
    total.failed += batch.failed;
    if (batch.processed === 0) break;
  }

  return total;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
