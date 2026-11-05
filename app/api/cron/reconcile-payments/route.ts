import { NextRequest, NextResponse } from "next/server";
import { assertCronAuthorized } from "@/lib/ops/cron-auth";
import { reconcilePayments } from "@/lib/payments/reconcile-payments";

export const maxDuration = 120;

// Every 10 minutes: confirm payments whose webhook never arrived, expire week-old unpaid attempts.
export async function GET(req: NextRequest) {
  const denied = assertCronAuthorized(req);
  if (denied) return denied;
  try {
    const summary = await reconcilePayments();
    if (summary.paid || summary.errors.length) console.info("[Cron] reconcile-payments", summary);
    return NextResponse.json({ success: true, ...summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[Cron] reconcile-payments failed:", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
