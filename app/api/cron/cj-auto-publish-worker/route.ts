import { NextResponse } from "next/server";
import { isAutomaticAutoPublishEnabled } from "@/lib/platform/background-jobs";
import { runAutoPublishWorker } from "@/lib/cj/premium-intelligence/auto-publish-worker";
import { getCatalogDB } from "@/lib/cj/premium-intelligence/db";
import { getActiveHeavyWorkerJob } from "@/lib/cj/premium-intelligence/worker-coordinator";

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

async function isWorkerSchemaReady(): Promise<boolean> {
  try {
    const db = getCatalogDB();
    const { error } = await db.from("cj_auto_publish_queue").select("id").limit(1);
    return !error;
  } catch {
    return false;
  }
}

/** Every 2 minutes — autonomous Auto Publish Worker */
export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isAutomaticAutoPublishEnabled()) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "Automatic auto-publish worker is disabled. Manual publish remains available.",
    });
  }

  try {
    if (!(await isWorkerSchemaReady())) {
      return NextResponse.json({
        ok: false,
        skipped: true,
        reason: "Auto publish queue schema not ready — apply migration 068+",
      });
    }

    const activeJob = await getActiveHeavyWorkerJob();
    if (activeJob === "enrichment" || activeJob === "list_sync") {
      const { processAutoPublishQueue, queueReadyProductsFromIntel } = await import(
        "@/lib/cj/premium-intelligence/auto-publish-queue"
      );
      const { AUTO_PUBLISH_WORKER_BATCH_SIZE } = await import(
        "@/lib/cj/premium-intelligence/system-publish"
      );
      await queueReadyProductsFromIntel(50);
      const queue = await processAutoPublishQueue(AUTO_PUBLISH_WORKER_BATCH_SIZE);
      return NextResponse.json({
        ok: true,
        deferred: true,
        activeJob,
        queueOnly: queue,
      });
    }

    const result = await runAutoPublishWorker();
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "failed" },
      { status: 500 }
    );
  }
}
