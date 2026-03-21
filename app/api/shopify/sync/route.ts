import { NextRequest, NextResponse } from "next/server";
import { syncVendorShopifyProducts } from "@/services/shopifyProductSync";
import { requireAdmin, requireVendorOwnerOrAdmin } from "@/lib/auth/api-helpers";
import { getPlatformShopifyVendorIdFromEnv } from "@/lib/platform-shopify";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const vendorIdFromBody = typeof body.vendorId === "string" ? body.vendorId.trim() : "";
  const platformVendorId = getPlatformShopifyVendorIdFromEnv();
  const effectiveVendorId = vendorIdFromBody || platformVendorId;

  if (!effectiveVendorId) {
    return NextResponse.json(
      {
        error:
          "Missing vendorId, or set JIMVIO_PLATFORM_SHOPIFY_VENDOR_ID for platform-owned Shopify.",
      },
      { status: 400 }
    );
  }

  const gate = vendorIdFromBody
    ? await requireVendorOwnerOrAdmin(vendorIdFromBody)
    : await requireAdmin();
  if ("error" in gate) return gate.error;

  const result = await syncVendorShopifyProducts(effectiveVendorId);
  return NextResponse.json({ ok: true, ...result });
}
