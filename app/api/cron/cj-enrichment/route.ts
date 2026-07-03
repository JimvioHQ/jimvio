import { NextResponse } from "next/server";
import {
  bootstrapCatalog,
  processEnrichmentQueue,
  retryFailedEnrichments,
  syncCjListCatalog,
} from "@/lib/cj/premium-intelligence";
import { getSchemaHealth } from "@/lib/cj/premium-intelligence/schema-health";

export const runtime = "nodejs";
export const maxDuration = 120;

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

/** Process enrichment queue — run frequently between 6h syncs */
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
    const retried = await retryFailedEnrichments(50);
    const result = await processEnrichmentQueue(25);
    return NextResponse.json({ ok: true, retried, ...result });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "failed" },
      { status: 500 }
    );
  }
}
