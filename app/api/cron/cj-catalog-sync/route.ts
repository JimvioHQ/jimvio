import { NextResponse } from "next/server";
import {
  bootstrapCatalog,
  processEnrichmentQueue,
  retryFailedEnrichments,
  syncCjListCatalog,
} from "@/lib/cj/premium-intelligence";
import { getSchemaHealth } from "@/lib/cj/premium-intelligence/schema-health";

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

/** Every 6 hours — list sync + enrichment batch */
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

    await bootstrapCatalog({ runSyncIfEmpty: true, runEnrichment: false });
    const listSync = await syncCjListCatalog({ maxPages: 120 });
    await bootstrapCatalog({ runSyncIfEmpty: false, runEnrichment: false });
    const retried = await retryFailedEnrichments(100);
    const enrichment = await processEnrichmentQueue(30);
    return NextResponse.json({ ok: true, listSync, retried, enrichment });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "failed" },
      { status: 500 }
    );
  }
}
