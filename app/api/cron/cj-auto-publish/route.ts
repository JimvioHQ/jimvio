import { NextResponse } from "next/server";
import { isAutomaticAutoPublishEnabled } from "@/lib/platform/background-jobs";
import { runAutoPublishRetry } from "@/lib/cj/premium-intelligence/auto-publish-retry";
import { computeAutoPublishAnalytics } from "@/lib/cj/premium-intelligence/auto-publish-analytics";
import { getSchemaHealth } from "@/lib/cj/premium-intelligence/schema-health";
import { runAutoPublishWorker } from "@/lib/cj/premium-intelligence/auto-publish-worker";

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

/** Every 6 hours — re-evaluate draft products, queue & publish ready ones (50/batch) */
export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isAutomaticAutoPublishEnabled()) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "Automatic auto-publish is disabled. Manual publish remains available.",
    });
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

    const retry = await runAutoPublishRetry();
    const worker = await runAutoPublishWorker();
    const analytics = await computeAutoPublishAnalytics();

    return NextResponse.json({ ok: true, retry, worker, analytics });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "failed" },
      { status: 500 }
    );
  }
}
