import { NextRequest, NextResponse } from "next/server";
import { saveVendorToken } from "@/lib/shopifyToken";
import { syncVendorShopifyProducts } from "@/services/shopifyProductSync";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin, requireVendorOwnerOrAdmin } from "@/lib/auth/api-helpers";
import { getShopifyPlatformCommissionFallback } from "@/lib/platform-settings";
import { getPlatformShopifyVendorIdFromEnv, getShopifyApiVersionFromEnv } from "@/lib/platform-shopify";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export async function POST(req: NextRequest) {
  const { shopDomain, accessToken, vendorId: vendorIdBody } = await req.json();

  if (!shopDomain || !accessToken) {
    return NextResponse.json({ error: "Missing shop domain or access token" }, { status: 400 });
  }

  const vendorIdFromBody = typeof vendorIdBody === "string" ? vendorIdBody.trim() : "";
  const platformVendorId = getPlatformShopifyVendorIdFromEnv();
  const effectiveVendorId = vendorIdFromBody || platformVendorId;

  if (!effectiveVendorId) {
    return NextResponse.json(
      {
        error:
          "No vendor: paste a Vendor ID, or set JIMVIO_PLATFORM_SHOPIFY_VENDOR_ID for platform-owned Shopify (see migration note / docs).",
      },
      { status: 400 }
    );
  }

  const gate = vendorIdFromBody
    ? await requireVendorOwnerOrAdmin(vendorIdFromBody)
    : await requireAdmin();
  if ("error" in gate) return gate.error;

  const normalizedDomain = String(shopDomain).replace(/^https?:\/\//, "").split("/")[0];

  const apiVersion = getShopifyApiVersionFromEnv();
  const testRes = await fetch(`https://${normalizedDomain}/admin/api/${apiVersion}/shop.json`, {
    headers: { "X-Shopify-Access-Token": accessToken },
  });
  if (!testRes.ok) {
    return NextResponse.json({ error: "Invalid Shopify credentials" }, { status: 400 });
  }

  const platformCommissionRate = await getShopifyPlatformCommissionFallback(supabase);

  await saveVendorToken({
    vendorId: effectiveVendorId,
    shopDomain: normalizedDomain,
    accessToken,
    apiVersion,
    platformCommissionRate,
  });

  const result = await syncVendorShopifyProducts(effectiveVendorId);

  return NextResponse.json({ connected: true, ...result });
}
