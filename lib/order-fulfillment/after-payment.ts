import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeProductSource, type ProductSource } from "@/lib/sources/product-source";
import { submitCjOrderForLines } from "@/lib/sources/cj/submit-order";

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
    await db.from("order_status_history").insert({
      order_id: params.orderId,
      previous_status: null,
      new_status: "confirmed",
      notes: "CJ submission skipped: shipping method not saved at checkout.",
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
        (variant.cj_vid as string | null) ??
        ((variant.source_metadata as Record<string, unknown> | null)?.cj_vid as string | undefined) ??
        null;
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
          (meta?.cj_vid as string | undefined) ??
          (meta?.vid as string | undefined) ??
          (variantId ? variantVidMap.get(variantId) : null) ??
          null,
      };
    })
  );

  if (!result.ok) {
    console.error(`[CJ] Submission failed for order ${params.orderId}:`, result.error);
    await db.from("order_status_history").insert({
      order_id: params.orderId,
      previous_status: "confirmed",
      new_status: "processing",
      notes: `CJ order submission FAILED: ${result.error ?? "unknown error"}`,
      metadata: { cj_error: result.error ?? null },
    });
    return;
  }

  if (result.externalReference) {
    await db
      .from("orders")
      .update({
        cj_order_id: result.externalReference,
        cj_fulfillment_status: "processing",
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.orderId);
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
