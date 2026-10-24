import { NextResponse } from "next/server";
import { sweepExpiredLicenses } from "@/lib/digital-products/trust/service";
import { assertCronAuthorized } from "@/lib/ops/cron-auth";

export const dynamic = "force-dynamic";

/**
 * Daily license-expiry sweep. Requires CRON_SECRET on hosted environments.
 * Each run examines at most 50 accepted licenses whose end date has passed.
 * It does not mark anything clean, licensed, or approved.
 */
export async function GET(request: Request) {
  const denied = assertCronAuthorized(request);
  if (denied) return denied;

  try {
    const result = await sweepExpiredLicenses(undefined, 50);
    return NextResponse.json({ ok: true, ...result });
  } catch {
    return NextResponse.json({ ok: false, error: "License expiry sweep failed." }, { status: 500 });
  }
}
