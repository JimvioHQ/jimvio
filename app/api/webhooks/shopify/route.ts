import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { syncVendorShopifyProducts } from "@/services/shopifyProductSync";
import { getVendorTokenByDomain } from "@/lib/shopifyToken";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/** HMAC must use the app client secret (Dev Dashboard → Credentials → Secret). See https://shopify.dev/docs/apps/webhooks/configuration/https#step-5-verify-the-webhook */
function verifyShopifyWebhook(body: string, hmacHeader: string, clientSecret: string): boolean {
  if (!clientSecret || !hmacHeader) return false;
  try {
    const calculatedB64 = crypto.createHmac("sha256", clientSecret).update(body, "utf8").digest("base64");
    const a = Buffer.from(calculatedB64, "base64");
    const b = Buffer.from(hmacHeader, "base64");
    if (a.length !== b.length || a.length === 0) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const hmac = req.headers.get("x-shopify-hmac-sha256") || "";
  const topic = req.headers.get("x-shopify-topic") || "";
  const shopDomain = req.headers.get("x-shopify-shop-domain") || "";

  const secret = process.env.SHOPIFY_WEBHOOK_SECRET || "";
  if (!verifyShopifyWebhook(rawBody, hmac, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = JSON.parse(rawBody) as { id?: number; fulfillments?: Array<{ tracking_number?: string | null }> };

  if (topic === "products/create" || topic === "products/update") {
    const creds = await getVendorTokenByDomain(shopDomain);
    if (creds) {
      await syncVendorShopifyProducts(creds.vendorId);
    }
  }

  if (topic === "orders/fulfilled") {
    const shopifyOrderId = String(payload.id ?? "");
    const fulfillment = payload.fulfillments?.[0];

    const byId = await supabase
      .from("orders")
      .update({
        tracking_number: fulfillment?.tracking_number ?? null,
        tracking_status: "shipped",
        shopify_fulfillment_status: "fulfilled",
        status: "shipped",
        shipped_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("shopify_order_id", shopifyOrderId)
      .select("id");

    if (!byId.data?.length && shopifyOrderId) {
      await supabase
        .from("orders")
        .update({
          tracking_number: fulfillment?.tracking_number ?? null,
          tracking_status: "shipped",
          shopify_fulfillment_status: "fulfilled",
          status: "shipped",
          shipped_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .contains("shopify_order_ids", [shopifyOrderId]);
    }
  }

  if (topic === "orders/cancelled") {
    const shopifyOrderId = String(payload.id ?? "");
    const cancelUpdate = {
      status: "cancelled" as const,
      shopify_fulfillment_status: "cancelled",
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const byId = await supabase.from("orders").update(cancelUpdate).eq("shopify_order_id", shopifyOrderId).select("id");

    if (!byId.data?.length && shopifyOrderId) {
      await supabase.from("orders").update(cancelUpdate).contains("shopify_order_ids", [shopifyOrderId]);
    }
  }

  return NextResponse.json({ received: true });
}
