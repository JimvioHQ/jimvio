import { NextResponse } from "next/server";
import { assertCronAuthorized } from "@/lib/ops/cron-auth";
import { runMarketplaceMaintenance } from "@/lib/cj/premium-intelligence/marketplace-maintenance";
import { getActiveHeavyWorkerJob } from "@/lib/cj/premium-intelligence/worker-coordinator";

export const runtime = "nodejs";
export const maxDuration = 300;


/** Daily at 02:00 UTC — self-healing marketplace maintenance (skips when enrichment/sync is running). */
export async function GET(req: Request) {
  const denied = assertCronAuthorized(req);
  if (denied) return denied;

  try {
    const activeJob = await getActiveHeavyWorkerJob();
    if (activeJob === "enrichment" || activeJob === "list_sync") {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: `Deferred — ${activeJob} worker active`,
        activeJob,
      });
    }

    const result = await runMarketplaceMaintenance();
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "failed" },
      { status: 500 }
    );
  }
}
