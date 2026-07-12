import { NextResponse } from "next/server";
import { getSchemaHealth } from "@/lib/cj/premium-intelligence/schema-health";
import { recalculateSupplierHealth } from "@/lib/cj/premium-intelligence/supplier-reputation-engine";
import { triggerAutoPublishFromWorker } from "@/lib/cj/premium-intelligence/auto-publish-worker";

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

/** Every 30min — recalculate supplier reputation, re-evaluate auto publish */
export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
