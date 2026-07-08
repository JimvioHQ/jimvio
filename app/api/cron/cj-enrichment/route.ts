import { NextResponse } from "next/server";
import {
  bootstrapCatalog,
  processEnrichmentQueueChained,
  retryFailedEnrichments,
  realignPendingEnrichmentStatus,
  resetStuckEnrichmentJobs,
} from "@/lib/cj/premium-intelligence";
import { getSchemaHealth } from "@/lib/cj/premium-intelligence/schema-health";

export const runtime = "nodejs";
export const maxDuration = 300;

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

/** Process enrichment queue continuously — chained batches until time budget expires */
export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const health = await getSchemaHealth();
    if (!health.ready) {
      return NextResponse.json({
        ok: false,
        skipped: true,
        reason: `Schema not ready: ${health.missingTables.join(", ")}`,
      });
    }

    await bootstrapCatalog({ runSyncIfEmpty: false, runEnrichment: false });
    const realigned = await realignPendingEnrichmentStatus(1000);
    const stuckReset = await resetStuckEnrichmentJobs();
    const retried = await retryFailedEnrichments(200);
    const result = await processEnrichmentQueueChained(100, {
      maxDurationMs: 280_000,
    });
    return NextResponse.json({ ok: true, realigned, stuckReset, retried, ...result });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "failed" },
      { status: 500 }
    );
  }
}
