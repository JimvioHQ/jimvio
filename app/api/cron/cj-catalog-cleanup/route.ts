import { NextResponse } from "next/server";
import { getSchemaHealth } from "@/lib/cj/premium-intelligence/schema-health";
import { runCatalogCleanup } from "@/lib/cj/premium-intelligence/catalog-cleanup";
import { computeCatalogHealth } from "@/lib/cj/premium-intelligence/catalog-health";
import { generateAiRecommendations } from "@/lib/cj/premium-intelligence/ai-recommendations";
import { logAutoPublishEvent } from "@/lib/cj/premium-intelligence/auto-publish-events";

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

/** Daily — catalog cleanup + health snapshot + AI recommendations */
export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
