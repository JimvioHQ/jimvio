import { NextRequest, NextResponse } from "next/server";
import { syncAllShopifyVendors } from "@/services/shopifyProductSync";
import { assertCronAuthorized } from "@/lib/ops/cron-auth";

export async function GET(req: NextRequest) {
  const denied = assertCronAuthorized(req);
  if (denied) return denied;

  const result = await syncAllShopifyVendors();
  return NextResponse.json({ ok: true, ...result, timestamp: new Date().toISOString() });
}
