import { NextRequest, NextResponse } from "next/server";
import { releasePendingPayouts } from "@/lib/ugc/clearPendingPayouts";
import { assertCronAuthorized } from "@/lib/ops/cron-auth";

export const maxDuration = 120;

// Hourly at minute 17 UTC: moves UGC earnings whose 24-hour hold has ended into the wallet.
export async function GET(req: NextRequest) {
  const denied = assertCronAuthorized(req);
  if (denied) return denied;
  try {
    const result = await releasePendingPayouts();
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[Cron] UGC payout release failed:", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
