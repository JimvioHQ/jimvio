import { NextResponse } from "next/server";
import { assertCronAuthorized } from "@/lib/ops/cron-auth";
import { isMarketplaceIntelligenceCronEnabled } from "@/lib/platform/background-jobs";
import { runTrendingUpdate } from "@/lib/marketplace/intelligence-v4/run-intelligence";
import { getIntelligenceSchemaHealth } from "@/lib/marketplace/intelligence-v4/schema-health";

export const runtime = "nodejs";
export const maxDuration = 300;


/** Hourly — update Jimvio trending scores */
export async function GET(req: Request) {
  const denied = assertCronAuthorized(req);
  if (denied) return denied;

  if (!isMarketplaceIntelligenceCronEnabled()) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "Marketplace intelligence cron is disabled.",
    });
  }

  try {
    const health = await getIntelligenceSchemaHealth();
    if (!health.ready) {
      return NextResponse.json({
        ok: false,
        skipped: true,
        reason: `Schema not ready: ${health.missingTables.join(", ")}`,
      });
    }

    const result = await runTrendingUpdate();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "failed" },
      { status: 500 }
    );
  }
}
