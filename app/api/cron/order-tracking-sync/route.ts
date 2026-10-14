import { NextResponse } from "next/server";
import { syncCJOrders } from "@/lib/cj/order-sync";
import { assertCronAuthorized } from "@/lib/ops/cron-auth";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: Request) {
  const denied = assertCronAuthorized(req);
  if (denied) return denied;
  try {
    const result = await syncCJOrders({ limit: 12 });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Tracking sync failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
