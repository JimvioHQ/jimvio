import type { SupabaseClient } from "@supabase/supabase-js";
import type { NormalizedInboundOrder } from "../stores/types";
import { claimIdempotency, completeIdempotency } from "../api/idempotency";
import { logIntegration } from "../observability/log";
import { buildExternalOrderPaymentPatch } from "./payment-state";

export type IngestOrderResult =
  | { ok: true; orderId: string; created: boolean; duplicate: boolean }
  | { ok: false; error: string; code: string };

/**
 * Normalize + ingest an external store order into Jimvio orders.
 * Idempotent on (merchant_store_id, external_order_id).
 */
export async function ingestStoreOrder(
  db: SupabaseClient,
  params: {
    vendorId: string;
    storeId: string;
    orderChannel: "shopify" | "woocommerce" | "custom" | "api";
    normalized: NormalizedInboundOrder;
    idempotencyKey?: string;
  }
): Promise<IngestOrderResult> {
  const started = Date.now();
  const externalId = params.normalized.externalOrderId;
  if (!externalId) {
    return { ok: false, error: "External order id is missing.", code: "MISSING_EXTERNAL_ID" };
  }

  const scope = `order_ingest:${params.storeId}`;
  const idemKey = params.idempotencyKey || `${params.orderChannel}:${externalId}`;

  const claim = await claimIdempotency(db, {
    vendorId: params.vendorId,
    scope,
    idempotencyKey: idemKey,
  });
  if (claim.hit && claim.responseBody) {
    return claim.responseBody as IngestOrderResult;
  }

  const releaseClaim = async () => {
    await db
      .from("ds_idempotency_keys")
      .delete()
      .eq("scope", scope)
      .eq("idempotency_key", idemKey);
  };

  const incomingPaymentStatus = params.normalized.paymentStatus ?? "pending";
  const isCancelled = Boolean(params.normalized.isCancelled);
  const { data: existing, error: existingError } = await db
    .from("orders")
    .select("id, payment_status, status, fulfillment_status_normalized, cj_order_id")
    .eq("merchant_store_id", params.storeId)
    .eq("external_order_id", externalId)
    .maybeSingle();

  if (existingError) {
    await releaseClaim();
    return { ok: false, error: "Could not check the existing external order.", code: "ORDER_LOOKUP_FAILED" };
  }

  if (existing?.id) {
    const patch = buildExternalOrderPaymentPatch(
      existing,
      incomingPaymentStatus,
      isCancelled,
      new Date().toISOString()
    );

    if (Object.keys(patch).length) {
      const { error: updateError } = await db
        .from("orders")
        .update(patch)
        .eq("id", existing.id);
      if (updateError) {
        await releaseClaim();
        return { ok: false, error: "Could not update external order payment state.", code: "ORDER_PAYMENT_UPDATE_FAILED" };
      }
    }

    const result: IngestOrderResult = {
      ok: true,
      orderId: existing.id,
      created: false,
      duplicate: true,
    };
    await completeIdempotency(db, scope, idemKey, 200, result);
    return result;
  }

  // Map line items via store_product_links
  const variantIds = params.normalized.lineItems
    .map((l) => l.storeVariantId)
    .filter((id): id is string => Boolean(id));

  const { data: links } = variantIds.length
    ? await db
        .from("store_product_links")
        .select("id, product_id, variant_id, store_variant_id, supplier_code, supplier_variant_id, vendor_id")
        .eq("store_id", params.storeId)
        .in("store_variant_id", variantIds)
    : { data: [] as Array<Record<string, unknown>> };

  const linkByStoreVariant = new Map(
    (links ?? []).map((l) => [String(l.store_variant_id), l])
  );

  const unmapped = params.normalized.lineItems.filter(
    (l) => l.storeVariantId && !linkByStoreVariant.has(l.storeVariantId)
  );
  if (unmapped.length) {
    const result: IngestOrderResult = {
      ok: false,
      error: "Product variant mapping is missing for one or more line items.",
      code: "MISSING_VARIANT_MAPPING",
    };
    await logIntegration(db, {
      vendorId: params.vendorId,
      storeId: params.storeId,
      operation: "order_ingest",
      status: "error",
      errorCode: "MISSING_VARIANT_MAPPING",
      message: result.error,
      durationMs: Date.now() - started,
      externalId,
    });
    await releaseClaim();
    return result;
  }

  // Use vendor user as buyer placeholder for external orders when no Jimvio buyer exists
  const { data: vendor } = await db
    .from("vendors")
    .select("user_id")
    .eq("id", params.vendorId)
    .maybeSingle();

  if (!vendor?.user_id) {
    await releaseClaim();
    return { ok: false, error: "Merchant vendor account not found.", code: "VENDOR_NOT_FOUND" };
  }

  const orderPaymentStatus = incomingPaymentStatus;
  const orderStatus = isCancelled
    ? orderPaymentStatus === "refunded" ? "refunded" : "cancelled"
    : orderPaymentStatus === "paid"
      ? "confirmed"
      : orderPaymentStatus === "refunded"
        ? "refunded"
        : orderPaymentStatus === "failed" || orderPaymentStatus === "cancelled"
          ? "cancelled"
          : "pending";

  const { data: order, error: orderErr } = await db
    .from("orders")
    .insert({
      buyer_id: vendor.user_id,
      vendor_id: params.vendorId,
      status: orderStatus,
      payment_status: orderPaymentStatus,
      subtotal: params.normalized.subtotal,
      shipping_amount: params.normalized.shippingAmount,
      tax_amount: params.normalized.taxAmount,
      discount_amount: params.normalized.discountAmount,
      total_amount: params.normalized.total,
      currency: params.normalized.currency,
      shipping_address: params.normalized.shippingAddress,
      billing_address: params.normalized.billingAddress,
      merchant_store_id: params.storeId,
      external_order_id: externalId,
      order_channel: params.orderChannel,
      integration_source: params.orderChannel,
      shopify_order_id: params.orderChannel === "shopify" ? externalId : null,
      shopify_order_number: params.normalized.externalOrderNumber
        ? Number(params.normalized.externalOrderNumber) || null
        : null,
      source_payload: params.normalized.rawPayload,
      fulfillment_status_normalized: "pending",
      paid_at: orderPaymentStatus === "paid" ? new Date().toISOString() : null,
      metadata: {
        dropshipping_os: true,
        customer_email: params.normalized.email,
        customer_phone: params.normalized.phone,
      },
    })
    .select("id, order_number")
    .single();

  if (orderErr || !order) {
    const result: IngestOrderResult = {
      ok: false,
      error: orderErr?.message || "Failed to create Jimvio order.",
      code: "ORDER_CREATE_FAILED",
    };
    await releaseClaim();
    return result;
  }

  const itemRows = params.normalized.lineItems.map((line) => {
    const link = line.storeVariantId
      ? linkByStoreVariant.get(line.storeVariantId)
      : null;
    return {
      order_id: order.id,
      product_id: link?.product_id,
      vendor_id: params.vendorId,
      quantity: line.quantity,
      unit_price: line.unitPrice,
      total_price: line.totalPrice,
      product_source: link?.supplier_code === "cj" ? "cj" : "vendor",
      shopify_variant_id: line.storeVariantId,
      shopify_product_id: line.storeProductId,
      source_metadata: {
        variant_id: link?.variant_id,
        cj_vid: link?.supplier_variant_id,
        store_variant_id: line.storeVariantId,
        store_product_id: line.storeProductId,
        sku: line.sku,
        title: line.title,
      },
    };
  });

  const { error: itemsErr } = await db.from("order_items").insert(itemRows);
  if (itemsErr) {
    await db.from("orders").delete().eq("id", order.id);
    const result: IngestOrderResult = {
      ok: false,
      error: "Failed to create order items.",
      code: "ORDER_ITEMS_FAILED",
    };
    await completeIdempotency(db, scope, idemKey, 500, result);
    return result;
  }

  const result: IngestOrderResult = {
    ok: true,
    orderId: order.id,
    created: true,
    duplicate: false,
  };

  await logIntegration(db, {
    vendorId: params.vendorId,
    storeId: params.storeId,
    operation: "order_ingest",
    status: "success",
    durationMs: Date.now() - started,
    externalId,
    metadata: { orderId: order.id },
  });
  await completeIdempotency(db, scope, idemKey, 200, result);
  return result;
}
