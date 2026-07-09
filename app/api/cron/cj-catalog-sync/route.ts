import { NextResponse } from "next/server";
import {
  bootstrapCatalog,
  processEnrichmentQueue,
  retryFailedEnrichments,
  syncCjListCatalog,
} from "@/lib/cj/premium-intelligence";
import { getSchemaHealth } from "@/lib/cj/premium-intelligence/schema-health";
import {
  releaseHeavyWorkerLock,
  tryAcquireHeavyWorkerLock,
} from "@/lib/cj/premium-intelligence/worker-coordinator";

export const runtime = "nodejs";
export const maxDuration = 300;

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return (
    req.headers.get("authorization") === `Bearer ${secret}` ||
    req.headers.get("x-cron-secret") === secret
  );
}

/** Every 6 hours — list sync + small enrichment batch (skips if another heavy worker is active). */
export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const lock = await tryAcquireHeavyWorkerLock("list_sync", {
    metadata: { source: "cj-catalog-sync-cron" },
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

    await bootstrapCatalog({ runSyncIfEmpty: true, runEnrichment: false });
    const listSync = await syncCjListCatalog({ maxPages: 120 });
    await bootstrapCatalog({ runSyncIfEmpty: false, runEnrichment: false });
    const retried = await retryFailedEnrichments(50);
    const enrichment = await processEnrichmentQueue(20, {
      maxDurationMs: 120_000,
      useCheckpoint: true,
      runId: lock.runId,
      skipFinishRun: true,
    });

    await releaseHeavyWorkerLock(lock.runId, {
      status: "success",
      total_fetched: listSync.fetched ?? 0,
      total_saved: listSync.saved ?? 0,
      metadata: { listSync, retried, enrichment: enrichment.metrics },
    });

    return NextResponse.json({ ok: true, listSync, retried, enrichment });
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
