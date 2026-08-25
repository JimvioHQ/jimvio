import { NextResponse } from "next/server";
import { syncAllShopifyVendors } from "@/services/shopifyProductSync";
import { assertCronAuthorized } from "@/lib/ops/cron-auth";

/**
 * Scheduled Cron Job: Verified consistency between Shopify and Local Database.
 * Target this endpoint with Vercel Cron (Authorization: Bearer CRON_SECRET).
 */
export async function GET(request: Request) {
  const denied = assertCronAuthorized(request);
  if (denied) return denied;

  try {
    console.log("[Cron-Shopify] Starting global sync and cleanup task...");
    const result = await syncAllShopifyVendors();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result
    });
  } catch (error: any) {
    console.error("[Cron-Shopify] Global sync failed:", error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
