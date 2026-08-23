import {
  claimEnrichmentJob,
  finishSyncRun,
  markQueueJob,
  pollEnrichmentJobs,
  startSyncRun,
} from "./catalog-repository";
import { enrichSingleProduct } from "./enrich-product";
import type { EnrichmentBatchResult } from "./types";
import {
  countPendingEnrichmentQueue,
  getEnrichmentCheckpoint,
  resetEnrichmentCheckpoint,
  saveEnrichmentCheckpoint,
  type EnrichmentRunMetrics,
} from "./worker-coordinator";
import {
  getCjRateMetrics,
  resetCjRateMetricsWindow,
} from "@/lib/cj/cj-rate-limiter";

const DEFAULT_INTER_JOB_MS = 200;
const DEFAULT_BATCH_LIMIT = 30;
const DEFAULT_MAX_DURATION_MS = 240_000;

export type EnrichmentQueueOptions = {
  maxDurationMs?: number;
  useCheckpoint?: boolean;
  interJobMs?: number;
  /** When set, skip creating a separate sync run (caller owns the lock). */
  runId?: string | null;
  skipFinishRun?: boolean;
};

export type EnrichmentBatchResultExtended = EnrichmentBatchResult & {
  skipped?: number;
  timedOut?: boolean;
  metrics?: EnrichmentRunMetrics;
};

export async function processEnrichmentQueue(
  limit = DEFAULT_BATCH_LIMIT,
  options?: EnrichmentQueueOptions
): Promise<EnrichmentBatchResultExtended> {
  const maxDuration = options?.maxDurationMs ?? DEFAULT_MAX_DURATION_MS;
  const useCheckpoint = options?.useCheckpoint ?? true;
  const interJobMs = options?.interJobMs ?? DEFAULT_INTER_JOB_MS;
  const start = Date.now();

  resetCjRateMetricsWindow();

  const checkpoint = useCheckpoint ? await getEnrichmentCheckpoint() : { lastPid: "", batchCompleted: 0, remainingEstimate: 0, updatedAt: null };
  const queueLength = await countPendingEnrichmentQueue();

  const jobs = await pollEnrichmentJobs(limit, checkpoint.lastPid || undefined);

  // Cursor wrapped — restart from head when no rows after cursor
  const effectiveJobs =
    jobs.length === 0 && checkpoint.lastPid
      ? await pollEnrichmentJobs(limit)
      : jobs;

  if (effectiveJobs.length === 0 && checkpoint.lastPid) {
    await resetEnrichmentCheckpoint();
  }

  const runId =
    options?.runId !== undefined
      ? options.runId
      : await startSyncRun("enrichment");
  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  let skipped = 0;
  let timedOut = false;
  let lastPid = checkpoint.lastPid;
  const enrichmentDurations: number[] = [];

  for (const job of effectiveJobs) {
    if (Date.now() - start >= maxDuration) {
      timedOut = true;
      break;
    }

    const pid = job.pid as string;
    const claimed = await claimEnrichmentJob(pid);
    if (!claimed) {
      skipped++;
      continue;
    }

    processed++;
    const jobStart = Date.now();
    let result: Awaited<ReturnType<typeof enrichSingleProduct>> = false;
    try {
      result = await enrichSingleProduct(pid);
    } catch (err) {
      await markQueueJob(pid, {
        status: "failed",
        last_error: err instanceof Error ? err.message : "enrichment failed",
      }).catch(() => undefined);
    }
    enrichmentDurations.push(Date.now() - jobStart);

    if (result === "skipped") skipped++;
    else if (result) succeeded++;
    else failed++;

    lastPid = pid;

    if (useCheckpoint) {
      await saveEnrichmentCheckpoint(
        lastPid,
        checkpoint.batchCompleted + processed,
        Math.max(0, queueLength - processed)
      );
    }

    if (interJobMs > 0) {
      await sleep(interJobMs);
    }
  }

  const remainingEstimate = Math.max(0, queueLength - processed);
  if (!timedOut && effectiveJobs.length < limit) {
    await resetEnrichmentCheckpoint();
  }

  const rateMetrics = getCjRateMetrics();
  const avgEnrichmentMs =
    enrichmentDurations.length > 0
      ? Math.round(
          enrichmentDurations.reduce((a, b) => a + b, 0) / enrichmentDurations.length
        )
      : 0;

  const metrics: EnrichmentRunMetrics = {
    batchSize: limit,
    processed,
    succeeded,
    failed,
    skipped,
    remainingEstimate,
    queueLength,
    cjRequestsPerSec: rateMetrics.requestsPerSec,
    rateLimit429Count: rateMetrics.rateLimit429Count,
    timeoutExit: timedOut,
    avgEnrichmentMs,
    checkpointPid: lastPid,
  };

  if (!options?.skipFinishRun) {
    await finishSyncRun(runId, {
      status: failed > 0 && succeeded === 0 ? "failed" : failed > 0 ? "partial" : "success",
      total_fetched: effectiveJobs.length,
      total_saved: succeeded,
      total_errors: failed,
      metadata: metrics as unknown as Record<string, unknown>,
    });
  }

  return { processed, succeeded, failed, skipped, timedOut, metrics };
}

/**
 * Process enrichment batches back-to-back until the queue is empty or time budget expires.
 * Prefer single-batch mode for dedicated enrichment cron to avoid 504 timeouts.
 */
export async function processEnrichmentQueueChained(
  batchSize = 25,
  options?: { maxDurationMs?: number; useCheckpoint?: boolean }
): Promise<EnrichmentBatchResultExtended> {
  const maxDuration = options?.maxDurationMs ?? 90_000;
  const start = Date.now();
  const total: EnrichmentBatchResultExtended = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    skipped: 0,
  };

  while (Date.now() - start < maxDuration) {
    const remaining = maxDuration - (Date.now() - start);
    const batch = await processEnrichmentQueue(batchSize, {
      maxDurationMs: Math.min(remaining, DEFAULT_MAX_DURATION_MS),
      useCheckpoint: options?.useCheckpoint ?? false,
    });
    total.processed += batch.processed;
    total.succeeded += batch.succeeded;
    total.failed += batch.failed;
    total.skipped = (total.skipped ?? 0) + (batch.skipped ?? 0);
    total.metrics = batch.metrics;
    total.timedOut = batch.timedOut;
    if (batch.processed === 0 || batch.timedOut) break;
  }

  return total;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
