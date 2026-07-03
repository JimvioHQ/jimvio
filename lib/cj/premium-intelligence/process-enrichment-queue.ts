import {
  finishSyncRun,
  pollEnrichmentJobs,
  startSyncRun,
} from "./catalog-repository";
import { enrichSingleProduct } from "./enrich-product";
import type { EnrichmentBatchResult } from "./types";

export async function processEnrichmentQueue(
  limit = 15
): Promise<EnrichmentBatchResult> {
  const runId = await startSyncRun("enrichment");
  const jobs = await pollEnrichmentJobs(limit);

  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  for (const job of jobs) {
    processed++;
    const ok = await enrichSingleProduct(job.pid);
    if (ok) succeeded++;
    else failed++;
    await sleep(400);
  }

  await finishSyncRun(runId, {
    status: failed > 0 && succeeded === 0 ? "failed" : failed > 0 ? "partial" : "success",
    total_fetched: jobs.length,
    total_saved: succeeded,
    total_errors: failed,
  });

  return { processed, succeeded, failed };
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
