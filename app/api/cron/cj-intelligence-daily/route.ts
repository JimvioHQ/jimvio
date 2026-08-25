import { NextResponse } from "next/server";
import { assertCronAuthorized } from "@/lib/ops/cron-auth";
import { runDailyScoreRecalc } from "@/lib/cj/premium-intelligence/refresh-jobs";

export const runtime = "nodejs";
export const maxDuration = 300;


/** Every 24 hours — trend, health, supplier recalculation */
export async function GET(req: Request) {
  const denied = assertCronAuthorized(req);
  if (denied) return denied;

  try {
    const result = await runDailyScoreRecalc();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "failed" },
      { status: 500 }
    );
  }
}
