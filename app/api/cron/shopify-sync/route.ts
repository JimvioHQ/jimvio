import { NextResponse } from "next/server";
import { syncAllShopifyVendors } from "@/services/shopifyProductSync";

/**
 * Scheduled Cron Job: Verified consistency between Shopify and Local Database.
 * Runs 'syncAllShopifyVendors' which now includes:
 * 1. Bulk fetching products from all activated Shopify vendors.
 * 2. Upserting changed/new products (Title, Price, Inventory updates).
 * 3. Cleaning up (deleting) products that no longer exist in Shopify.
 * 
 * Target this endpoint with Vercel Cron or any external cron service.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");

  // Basic security to prevent unauthorized triggers
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

// Ensure it's never cached
export const dynamic = "force-dynamic";
