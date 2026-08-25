import { NextResponse } from "next/server";
import { assertCronAuthorized } from "@/lib/ops/cron-auth";
import { getSchemaHealth } from "@/lib/cj/premium-intelligence/schema-health";
import { recalculateSupplierHealth } from "@/lib/cj/premium-intelligence/supplier-reputation-engine";
import { triggerAutoPublishFromWorker } from "@/lib/cj/premium-intelligence/auto-publish-worker";

export const runtime = "nodejs";
export const maxDuration = 300;


/** Every 30min — recalculate supplier reputation, re-evaluate auto publish */
export async function GET(req: Request) {
  const denied = assertCronAuthorized(req);
  if (denied) return denied;

  try {
    const health = await getSchemaHealth();
    if (!health.ready) {
      return NextResponse.json({ ok: false, skipped: true });
    }

    const updated = await recalculateSupplierHealth(1000);
    const worker = await triggerAutoPublishFromWorker();

    return NextResponse.json({ ok: true, updated, worker });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "failed" },
      { status: 500 }
    );
  }
}
