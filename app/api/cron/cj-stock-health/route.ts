import { NextResponse } from "next/server";
import { assertCronAuthorized } from "@/lib/ops/cron-auth";
import { getSchemaHealth } from "@/lib/cj/premium-intelligence/schema-health";
import { runStockHealthMonitor } from "@/lib/cj/premium-intelligence/auto-unpublish-monitor";
import { triggerAutoPublishFromWorker } from "@/lib/cj/premium-intelligence/auto-publish-worker";
import { assertCjQuotaAvailableForBackground } from "@/lib/cj/quota-circuit";

export const runtime = "nodejs";
export const maxDuration = 300;


/** Every 30 minutes at minutes 10 and 40 UTC — monitor stock, unpublish failing products, re-queue ready ones */
export async function GET(req: Request) {
  const denied = assertCronAuthorized(req);
  if (denied) return denied;

  if (!(await assertCjQuotaAvailableForBackground())) {
    console.warn("[cj-stock-health] skipped — CJ API quota circuit open");
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "cj_api_quota_circuit_open",
    });
  }

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
