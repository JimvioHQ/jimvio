import { NextResponse } from "next/server";
import { assertCronAuthorized } from "@/lib/ops/cron-auth";
import {
  bootstrapCatalog,
  processEnrichmentQueue,
  retryFailedEnrichments,
  realignPendingEnrichmentStatus,
  resetStuckEnrichmentJobs,
} from "@/lib/cj/premium-intelligence";
import { getSchemaHealth } from "@/lib/cj/premium-intelligence/schema-health";
import {
  releaseHeavyWorkerLock,
  tryAcquireHeavyWorkerLock,
} from "@/lib/cj/premium-intelligence/worker-coordinator";

export const runtime = "nodejs";
export const maxDuration = 300;

const BATCH_SIZE = 30;
const TIME_BUDGET_MS = 240_000;


/** One enrichment batch per invocation — checkpoint resumes on next cron tick. */
export async function GET(req: Request) {
  const denied = assertCronAuthorized(req);
  if (denied) return denied;

  const lock = await tryAcquireHeavyWorkerLock("enrichment", {
    metadata: { source: "cj-enrichment-cron" },
  });

  if (!lock.acquired) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: lock.reason,
      activeJob: lock.activeJob,
    });
  }

  try {
    const health = await getSchemaHealth();
    if (!health.ready) {
      await releaseHeavyWorkerLock(lock.runId, {
        status: "failed",
        error_message: `Schema not ready: ${health.missingTables.join(", ")}`,
      });
      return NextResponse.json({
        ok: false,
        skipped: true,
        reason: `Schema not ready: ${health.missingTables.join(", ")}`,
      });
    }

    await bootstrapCatalog({ runSyncIfEmpty: false, runEnrichment: false });
    const realigned = await realignPendingEnrichmentStatus(100);
    const stuckReset = await resetStuckEnrichmentJobs();
    const retried = await retryFailedEnrichments(50);

    const result = await processEnrichmentQueue(BATCH_SIZE, {
      maxDurationMs: TIME_BUDGET_MS,
      useCheckpoint: true,
      runId: lock.runId,
      skipFinishRun: true,
    });

    await releaseHeavyWorkerLock(lock.runId, {
      status: result.failed > 0 && result.succeeded === 0 ? "failed" : result.failed > 0 ? "partial" : "success",
      total_fetched: result.processed,
      total_saved: result.succeeded,
      total_errors: result.failed,
      metadata: {
        ...result.metrics,
        realigned,
        stuckReset,
        retried,
        timedOut: result.timedOut,
      },
    });

    return NextResponse.json({
      ok: true,
      realigned,
      stuckReset,
      retried,
      ...result,
    });
  } catch (err) {
    await releaseHeavyWorkerLock(lock.runId, {
      status: "failed",
      error_message: err instanceof Error ? err.message : "failed",
    });
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "failed" },
      { status: 500 }
    );
  }
}
