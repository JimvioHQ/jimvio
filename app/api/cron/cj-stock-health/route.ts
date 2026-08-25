import { NextResponse } from "next/server";
import { assertCronAuthorized } from "@/lib/ops/cron-auth";
import { getSchemaHealth } from "@/lib/cj/premium-intelligence/schema-health";
import { runStockHealthMonitor } from "@/lib/cj/premium-intelligence/auto-unpublish-monitor";
import { triggerAutoPublishFromWorker } from "@/lib/cj/premium-intelligence/auto-publish-worker";

export const runtime = "nodejs";
export const maxDuration = 300;


/** Every 30min — monitor stock, unpublish failing products, re-queue ready ones */
export async function GET(req: Request) {
  const denied = assertCronAuthorized(req);
  if (denied) return denied;

  try {
    const health = await getSchemaHealth();
    if (!health.ready) {
      return NextResponse.json({ ok: false, skipped: true });
    }

    const result = await runStockHealthMonitor();
    const worker = await triggerAutoPublishFromWorker();

    return NextResponse.json({ ok: true, result, worker });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "failed" },
      { status: 500 }
    );
  }
}
