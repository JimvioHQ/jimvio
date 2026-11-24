import { NextRequest } from "next/server";
import { createHash } from "crypto";
import { dsAdminDb } from "@/lib/dropshipping/tenant";
import { authenticateApiKey, apiError } from "@/lib/dropshipping/api/auth";
import { claimIdempotency, completeIdempotency } from "@/lib/dropshipping/api/idempotency";
import { ingestStoreOrder } from "@/lib/dropshipping/orders/ingest";

export const dynamic = "force-dynamic";

/** GET /api/v1/orders — list merchant-store / channel orders (orders:read) */
export async function GET(req: NextRequest) {
  const db = dsAdminDb();
  const auth = await authenticateApiKey(
    db,
    req.headers.get("authorization"),
    "orders:read"
  );
  if (!auth.ok) return apiError(auth.status, "unauthorized", auth.error);

  const url = req.nextUrl;
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || 50)));
  const storeId = url.searchParams.get("store_id");
  const status = url.searchParams.get("status");

  let query = db
    .from("orders")
    .select(
      "id, order_number, status, payment_status, fulfillment_status_normalized, total_amount, currency, merchant_store_id, external_order_id, order_channel, created_at, updated_at"
    )
    .eq("vendor_id", auth.auth.vendorId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (storeId) query = query.eq("merchant_store_id", storeId);
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return apiError(500, "query_failed", error.message);

  return Response.json({ data: data ?? [], meta: { limit } });
}

/**
 * POST /api/v1/orders — create/ingest an external order (orders:write).
 * Requires Idempotency-Key header.
 */
export async function POST(req: NextRequest) {
  const db = dsAdminDb();
  const auth = await authenticateApiKey(
    db,
    req.headers.get("authorization"),
    "orders:write"
  );
  if (!auth.ok) return apiError(auth.status, "unauthorized", auth.error);

  const idempotencyKey = req.headers.get("idempotency-key")?.trim();
  if (!idempotencyKey) {
    return apiError(400, "idempotency_required", "Idempotency-Key header is required.");
  }

  const body = (await req.json().catch(() => null)) as {
    store_id?: string;
    external_order_id?: string;
    external_order_number?: string;
    email?: string;
    phone?: string;
    currency?: string;
    subtotal?: number;
    shipping_amount?: number;
    tax_amount?: number;
    discount_amount?: number;
    total?: number;
    shipping_address?: Record<string, unknown>;
    billing_address?: Record<string, unknown>;
    line_items?: Array<{
      store_product_id?: string;
      store_variant_id?: string;
      sku?: string;
      title?: string;
      quantity: number;
      unit_price: number;
    }>;
  } | null;

  if (!body?.store_id || !body.external_order_id || !body.line_items?.length) {
    return apiError(
      400,
      "invalid_body",
      "store_id, external_order_id, and line_items are required."
    );
  }

  const requestHash = createHash("sha256").update(JSON.stringify(body)).digest("hex");
  const scope = `api_v1_orders:${auth.auth.vendorId}`;
  const claim = await claimIdempotency(db, {
    vendorId: auth.auth.vendorId,
    scope,
    idempotencyKey,
    requestHash,
  });
  if (claim.hit && claim.responseBody != null) {
    return Response.json(claim.responseBody, { status: claim.responseStatus ?? 200 });
  }

  const { data: store } = await db
    .from("merchant_stores")
    .select("id, platform, status")
    .eq("id", body.store_id)
    .eq("vendor_id", auth.auth.vendorId)
    .maybeSingle();

  if (!store) {
    return apiError(404, "store_not_found", "Store not found for this API key tenant.");
  }

  const channel =
    store.platform === "shopify" || store.platform === "woocommerce"
      ? store.platform
      : "api";

  const result = await ingestStoreOrder(db, {
    vendorId: auth.auth.vendorId,
    storeId: store.id,
    orderChannel: channel,
    idempotencyKey: `api:${body.external_order_id}`,
    normalized: {
      externalOrderId: body.external_order_id,
      externalOrderNumber: body.external_order_number ?? null,
      email: body.email ?? null,
      phone: body.phone ?? null,
      currency: body.currency || "USD",
      // API-ingested orders are unverified until a trusted payment webhook confirms capture.
      paymentStatus: "pending",
      subtotal: Number(body.subtotal ?? 0),
      shippingAmount: Number(body.shipping_amount ?? 0),
      taxAmount: Number(body.tax_amount ?? 0),
      discountAmount: Number(body.discount_amount ?? 0),
      total: Number(body.total ?? body.subtotal ?? 0),
      shippingAddress: body.shipping_address ?? null,
      billingAddress: body.billing_address ?? null,
      lineItems: body.line_items.map((li) => ({
        storeProductId: li.store_product_id ?? null,
        storeVariantId: li.store_variant_id ?? null,
        sku: li.sku ?? null,
        title: li.title ?? null,
        quantity: li.quantity,
        unitPrice: li.unit_price,
        totalPrice: li.unit_price * li.quantity,
      })),
      rawPayload: body as unknown as Record<string, unknown>,
    },
  });

  if (!result.ok) {
    const status = result.code === "MISSING_VARIANT_MAPPING" ? 422 : 500;
    const responseBody = { error: { code: result.code, message: result.error } };
    await completeIdempotency(db, scope, idempotencyKey, status, responseBody);
    return Response.json(responseBody, { status });
  }

  const responseBody = {
    data: {
      id: result.orderId,
      created: result.created,
      duplicate: result.duplicate,
    },
  };
  await completeIdempotency(db, scope, idempotencyKey, 201, responseBody);
  return Response.json(responseBody, { status: 201 });
}
