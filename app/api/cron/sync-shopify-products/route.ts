import { NextRequest, NextResponse } from "next/server";
import { syncAllShopifyVendors } from "@/services/shopifyProductSync";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await syncAllShopifyVendors();
  return NextResponse.json({ ok: true, ...result, timestamp: new Date().toISOString() });
}
