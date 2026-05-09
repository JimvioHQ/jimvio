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

  await submitCjOrderForLines(
    db,
    params.orderId,
    params.orderNumber,
    cjLines.map((line) => ({
      orderItemId: line.id,
      productId: line.product_id,
      vendorId: line.vendor_id,
      quantity: line.quantity,
      unitPrice: Number(line.unit_price),
      totalPrice: Number(line.total_price),
      sourceMetadata: (line.source_metadata as Record<string, unknown> | null) ?? null,
    }))
  );
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
