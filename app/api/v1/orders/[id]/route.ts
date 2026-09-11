import { NextRequest } from "next/server";
import { dsAdminDb } from "@/lib/dropshipping/tenant";
import { authenticateApiKey, apiError } from "@/lib/dropshipping/api/auth";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/v1/orders/:id */
export async function GET(req: NextRequest, ctx: Ctx) {
  const db = dsAdminDb();
  const auth = await authenticateApiKey(
    db,
    req.headers.get("authorization"),
    "orders:read"
  );
  if (!auth.ok) return apiError(auth.status, "unauthorized", auth.error);

  const { id } = await ctx.params;
  const { data: order, error } = await db
    .from("orders")
    .select(
      "id, order_number, status, payment_status, fulfillment_status_normalized, subtotal, shipping_amount, tax_amount, discount_amount, total_amount, currency, merchant_store_id, external_order_id, order_channel, shipping_address, tracking_number, tracking_status, created_at, updated_at, order_items(id, product_id, quantity, unit_price, total_price, product_source, shopify_variant_id, source_metadata)"
    )
    .eq("id", id)
    .eq("vendor_id", auth.auth.vendorId)
    .maybeSingle();

  if (error) return apiError(500, "query_failed", error.message);
  if (!order) return apiError(404, "not_found", "Order not found.");

  return Response.json({ data: order });
}
