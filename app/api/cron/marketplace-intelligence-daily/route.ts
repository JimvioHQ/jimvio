import { NextResponse } from "next/server";
import { assertCronAuthorized } from "@/lib/ops/cron-auth";
import { isMarketplaceIntelligenceCronEnabled } from "@/lib/platform/background-jobs";
import { runDailyLearning } from "@/lib/marketplace/intelligence-v4/run-intelligence";
import { computeMarketplaceIntelligenceAnalytics } from "@/lib/marketplace/intelligence-v4/analytics";
import { getIntelligenceSchemaHealth } from "@/lib/marketplace/intelligence-v4/schema-health";

export const runtime = "nodejs";
export const maxDuration = 300;


/** Daily — full ranking, learning, health snapshot */
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

    const run = await runDailyLearning();
    const analytics = await computeMarketplaceIntelligenceAnalytics();

    return NextResponse.json({ ok: true, run, analytics });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "failed" },
      { status: 500 }
    );
  }
}
