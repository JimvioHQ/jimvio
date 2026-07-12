import { NextResponse } from "next/server";
import { isMarketplaceIntelligenceCronEnabled } from "@/lib/platform/background-jobs";
import { runDailyLearning } from "@/lib/marketplace/intelligence-v4/run-intelligence";
import { computeMarketplaceIntelligenceAnalytics } from "@/lib/marketplace/intelligence-v4/analytics";
import { getIntelligenceSchemaHealth } from "@/lib/marketplace/intelligence-v4/schema-health";

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

/** Daily — full ranking, learning, health snapshot */
export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
