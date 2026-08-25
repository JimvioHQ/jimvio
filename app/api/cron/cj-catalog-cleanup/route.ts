import { NextResponse } from "next/server";
import { assertCronAuthorized } from "@/lib/ops/cron-auth";
import { getSchemaHealth } from "@/lib/cj/premium-intelligence/schema-health";
import { runCatalogCleanup } from "@/lib/cj/premium-intelligence/catalog-cleanup";
import { computeCatalogHealth } from "@/lib/cj/premium-intelligence/catalog-health";
import { generateAiRecommendations } from "@/lib/cj/premium-intelligence/ai-recommendations";
import { logAutoPublishEvent } from "@/lib/cj/premium-intelligence/auto-publish-events";

export const runtime = "nodejs";
export const maxDuration = 300;


/** Daily — catalog cleanup + health snapshot + AI recommendations */
export async function GET(req: Request) {
  const denied = assertCronAuthorized(req);
  if (denied) return denied;

  try {
    const health = await getSchemaHealth();
    if (!health.ready) {
      return NextResponse.json({ ok: false, skipped: true });
    }

    const cleanup = await runCatalogCleanup();
    const catalogHealth = await computeCatalogHealth();
    const recommendations = await generateAiRecommendations();

    await logAutoPublishEvent({ eventType: "quality_recalc" });

    return NextResponse.json({
      ok: true,
      cleanup,
      catalogHealth,
      recommendations: recommendations.length,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "failed" },
      { status: 500 }
    );
  }
}
