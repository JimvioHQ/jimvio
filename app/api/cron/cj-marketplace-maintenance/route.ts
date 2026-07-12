import { NextResponse } from "next/server";
import { runMarketplaceMaintenance } from "@/lib/cj/premium-intelligence/marketplace-maintenance";
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

/** Every 5 minutes — self-healing marketplace maintenance (skips when enrichment/sync is running). */
export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
