import { NextResponse } from "next/server";
import { assertCronAuthorized } from "@/lib/ops/cron-auth";
import {
  bootstrapCatalog,
  processEnrichmentQueue,
  retryFailedEnrichments,
  syncCjListCatalog,
} from "@/lib/cj/premium-intelligence";
import { isCjProductIntelligenceProcessingEnabled } from "@/lib/cj/intelligence-kill-switch";
import { getSchemaHealth } from "@/lib/cj/premium-intelligence/schema-health";
import {
  releaseHeavyWorkerLock,
  tryAcquireHeavyWorkerLock,
} from "@/lib/cj/premium-intelligence/worker-coordinator";
import { assertCjQuotaAvailableForBackground } from "@/lib/cj/quota-circuit";

export const runtime = "nodejs";
export const maxDuration = 300;


/** Every 6 hours — list sync + small enrichment batch (skips if another heavy worker is active). */
export async function GET(req: Request) {
  const denied = assertCronAuthorized(req);
  if (denied) return denied;

  if (!(await assertCjQuotaAvailableForBackground())) {
    console.warn("[cj-catalog-sync] skipped — CJ API quota circuit open");
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "cj_api_quota_circuit_open",
    });
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
    const listSync = await syncCjListCatalog({ maxPages: 20, maxDurationMs: 160_000 });
    await bootstrapCatalog({ runSyncIfEmpty: false, runEnrichment: false });
    const intelligenceEnabled = isCjProductIntelligenceProcessingEnabled();
    const retried = intelligenceEnabled ? await retryFailedEnrichments(50) : 0;
    const enrichment = intelligenceEnabled
      ? await processEnrichmentQueue(20, {
          maxDurationMs: 120_000,
          useCheckpoint: true,
          runId: lock.runId,
          skipFinishRun: true,
        })
      : { processed: 0, succeeded: 0, failed: 0, skipped: 0, timedOut: false, metrics: undefined };

    await releaseHeavyWorkerLock(lock.runId, {
      status: "success",
      total_fetched: listSync.fetched ?? 0,
      total_saved: listSync.saved ?? 0,
      metadata: { listSync, retried, enrichment: enrichment.metrics },
    });

    return NextResponse.json({ ok: true, listSync, retried, enrichment });
  } catch (err) {
    // Runs had been failing with an empty message; keep enough detail to diagnose.
    const message =
      err instanceof Error
        ? err.message || `${err.name}: ${(err.stack ?? "").split("\n").slice(0, 3).join(" | ")}`
        : (() => {
            try {
              return JSON.stringify(err);
            } catch {
              return String(err);
            }
          })();
    console.error("[cj-catalog-sync] failed", err);
    await releaseHeavyWorkerLock(lock.runId, {
      status: "failed",
      error_message: (message || "failed").slice(0, 500),
    });
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "failed" },
      { status: 500 }
    );
  }
}
