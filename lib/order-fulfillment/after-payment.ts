import type { SupabaseClient } from "@supabase/supabase-js";
import { CJ_CUSTOMER_MESSAGES, logCjInternalError } from "@/lib/cj/customer-errors";
import { advanceOrderFulfillment } from "@/lib/order-fulfillment/advance-order-status";
import { normalizeProductSource, type ProductSource } from "@/lib/sources/product-source";
import { submitCjOrderForLines } from "@/lib/sources/cj/submit-order";
import { usableCjVid } from "@/lib/cj/variant-vid";

type OrderItemRow = {
  id: string;
  product_id: string;
  vendor_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  product_source?: string | null;
  source_metadata?: Record<string, unknown> | null;
};

/**
 * Source-specific side effects after payment is recorded (CJ API, future Amazon, etc.).
 * Shopify push stays in finalizeOrderPayment / paymentService — do not duplicate here.
 */
export async function dispatchNonShopifyFulfillmentIntegrations(
  db: SupabaseClient,
  params: {
    orderId: string;
    orderNumber: string;
    items: OrderItemRow[];
  }
): Promise<void> {
  console.log("Dispatching fulfillment integrations for order", { orderId: params.orderId });

  const cjLines = params.items.filter((i) => normalizeProductSource(i.product_source) === "cj");
  console.log("CJ lines", { count: cjLines.length, items: cjLines.map(item => item.id) });
  
  if (cjLines.length === 0) {
    console.log("No CJ lines found, skipping fulfillment");
    return;
  }

  const { data: orderRow } = await db
    .from("orders")
    .select("cj_order_id, cj_shipping_method")
    .eq("id", params.orderId)
    .maybeSingle();

  if (orderRow?.cj_order_id) {
    console.log("[CJ] Order already submitted — skipping duplicate dispatch", {
      orderId: params.orderId,
      cjOrderId: orderRow.cj_order_id,
    });
    return;
  }

  if (!orderRow?.cj_shipping_method?.trim()) {
    console.warn(`[CJ] Order ${params.orderId} missing cj_shipping_method — cannot submit to CJ`);
    await logCjInternalError({
      action: "submit_skipped",
      message: "CJ submission skipped: shipping method not saved at checkout",
      error: "cj_shipping_method missing on order",
      orderId: params.orderId,
    });
    await db.from("order_status_history").insert({
      order_id: params.orderId,
      previous_status: null,
      new_status: "confirmed",
      notes: CJ_CUSTOMER_MESSAGES.shippingSkipped,
      metadata: { triggered_by: "system", status_type: "note" },
    });
    return;
  }

  const variantIds = cjLines
    .map((line) => (line.source_metadata as Record<string, unknown> | null)?.variant_id)
    .filter((id): id is string => typeof id === "string" && id.length > 0);

  const variantVidMap = new Map<string, string>();
  if (variantIds.length) {
    const { data: variants } = await db
      .from("product_variants")
      .select("id, cj_vid, source_metadata")
      .in("id", variantIds);

    for (const variant of variants ?? []) {
      const vid =
        usableCjVid(variant.cj_vid) ??
        usableCjVid(
          (variant.source_metadata as Record<string, unknown> | null)?.cj_vid
        );
      if (vid) variantVidMap.set(variant.id, vid);
    }
  }

  const result = await submitCjOrderForLines(
    db,
    params.orderId,
    params.orderNumber,
    cjLines.map((line) => {
      const meta = (line.source_metadata as Record<string, unknown> | null) ?? null;
      const variantId = typeof meta?.variant_id === "string" ? meta.variant_id : null;
      return {
        orderItemId: line.id,
        productId: line.product_id,
        vendorId: line.vendor_id,
        quantity: line.quantity,
        unitPrice: Number(line.unit_price),
        totalPrice: Number(line.total_price),
        sourceMetadata: meta,
        cjVid:
          usableCjVid(meta?.cj_vid) ??
          usableCjVid(meta?.vid) ??
          (variantId ? variantVidMap.get(variantId) : null) ??
          null,
      };
    })
  );

  if (!result.ok) {
    await logCjInternalError({
      action: "submit_fail",
      message: `CJ order submission failed for order ${params.orderNumber}`,
      error: result.error ?? "unknown error",
      orderId: params.orderId,
    });
    console.warn("[checkout] cj_order_submission_failed", {
      orderId: params.orderId,
      error: result.error ?? "unknown",
    });
    // Payment remains PAID — mark fulfillment retryable, never reverse payment.
    await db
      .from("orders")
      .update({
        cj_fulfillment_status: "failed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.orderId)
      .is("cj_order_id", null);
    await advanceOrderFulfillment(db, params.orderId, {
      newStatus: "processing",
      cjFulfillmentStatus: "failed",
      notes: CJ_CUSTOMER_MESSAGES.fulfillmentFailed,
      metadata: { triggered_by: "system", status_type: "note", retryable: true },
    });
    return;
  }

  if (result.externalReference) {
    const submittedAt = new Date().toISOString();
    console.info("[checkout] cj_order_submission_success", {
      orderId: params.orderId,
      cjOrderId: result.externalReference,
    });
    const { error: writebackError } = await db
      .from("orders")
      .update({
        cj_order_id: result.externalReference,
        cj_submit_time: submittedAt,
        cj_fulfillment_status: "submitted",
        updated_at: submittedAt,
      })
      .eq("id", params.orderId);

    if (writebackError) {
      console.error("[CJ] Supplier accepted the order but Jimvio could not save the CJ reference", {
        orderId: params.orderId,
        code: writebackError.code,
      });
      await logCjInternalError({
        action: "submit_writeback_fail",
        message: "CJ accepted the order but Jimvio failed to persist its reference",
        error: writebackError.message,
        orderId: params.orderId,
      });
      return;
    }

    const fulfillment = await advanceOrderFulfillment(db, params.orderId, {
      newStatus: "processing",
      cjFulfillmentStatus: "submitted",
      notes: "Your order was submitted to CJ and is being prepared for shipment.",
      metadata: { cj_order_id: result.externalReference, source: "cj_submit" },
    });
    if (!fulfillment.updated) {
      console.warn("[CJ] CJ reference saved but fulfillment status needs reconciliation", {
        orderId: params.orderId,
        cjOrderId: result.externalReference,
        orderStatus: fulfillment.status,
      });
    }
  }
}

export function isShopifyFulfillmentLine(item: {
  product_source?: string | null;
  shopify_variant_id?: number | null;
}): boolean {
  if (item.shopify_variant_id != null) return true;
  return normalizeProductSource(item.product_source) === "shopify";
}

export function lineSource(item: { product_source?: string | null; shopify_variant_id?: number | null }): ProductSource {
  if (item.shopify_variant_id != null) return "shopify";
  return normalizeProductSource(item.product_source);
}
