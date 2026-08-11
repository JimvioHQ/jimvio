/**
 * Buyer-facing order queries — exclude supplier identifiers (CJ, etc.)
 * from fields returned to the browser.
 *
 * IMPORTANT: columns must match the live `orders` / `order_items` schema.
 * `payment_provider` and `estimated_delivery_at` are NOT order columns —
 * provider lives on `transactions.provider` / `metadata.payment_provider`.
 */

export const CUSTOMER_ORDER_COLUMNS = `
  id,
  order_number,
  buyer_id,
  vendor_id,
  status,
  payment_status,
  subtotal,
  discount_amount,
  shipping_amount,
  tax_amount,
  total_amount,
  currency,
  shipping_address,
  billing_address,
  notes,
  paid_at,
  shipped_at,
  delivered_at,
  cancelled_at,
  created_at,
  affiliate_id,
  tracking_number,
  tracking_status,
  cj_fulfillment_status,
  shopify_fulfillment_status,
  metadata
`.replace(/\s+/g, " ");

export const CUSTOMER_ORDER_DETAIL_SELECT = `
  ${CUSTOMER_ORDER_COLUMNS},
  buyer:profiles!buyer_id ( full_name, email ),
  order_items (
    id, product_id, product_name, product_image, quantity,
    unit_price, total_price, product_type, digital_download_url,
    vendor_id,
    vendors ( id, business_name, business_slug, business_logo )
  ),
  transactions (
    id, provider, provider_transaction_id,
    status, amount, amount_usd, created_at
  )
`.replace(/\s+/g, " ");

export const CUSTOMER_ORDER_DETAIL_WITH_ITEMS_SELECT = `
  ${CUSTOMER_ORDER_COLUMNS},
  order_items (
    id, product_id, product_name, product_image, quantity,
    unit_price, total_price, product_type, digital_download_url,
    variant_id, download_count, access_granted_at,
    vendor_id,
    vendors ( id, business_name, business_slug, business_logo )
  )
`.replace(/\s+/g, " ");

export const CUSTOMER_ORDER_LIST_SELECT = `
  id,
  order_number,
  status,
  payment_status,
  total_amount,
  currency,
  tracking_number,
  shipped_at,
  delivered_at,
  cj_fulfillment_status,
  created_at,
  metadata,
  order_items ( product_name, product_image, quantity )
`.replace(/\s+/g, " ");

const SUPPLIER_METADATA_KEYS = [
  "cj_logistic_code",
  "cj_shipping_cost_usd",
  "cj_order_id",
  "cj_order_num",
  "flutterwave_transaction_id",
  "flutterwave_tx_ref",
  "gateway_used",
] as const;

/** Remove supplier-specific keys from order metadata before client render. */
export function sanitizeCustomerOrderMetadata(
  metadata: unknown
): Record<string, unknown> {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {};
  }

  const cleaned = { ...(metadata as Record<string, unknown>) };
  for (const key of SUPPLIER_METADATA_KEYS) {
    delete cleaned[key];
  }
  return cleaned;
}

/** Resolve payment provider from transactions or sanitized metadata. */
export function resolveOrderPaymentProvider(order: {
  payment_provider?: string | null;
  metadata?: unknown;
  transactions?: Array<{ provider?: string | null }> | null;
}): string | null {
  if (order.payment_provider) return order.payment_provider;
  const fromTx = order.transactions?.find((t) => t.provider)?.provider;
  if (fromTx) return fromTx;
  const meta = order.metadata;
  if (meta && typeof meta === "object" && !Array.isArray(meta)) {
    const value = (meta as Record<string, unknown>).payment_provider;
    return typeof value === "string" ? value : null;
  }
  return null;
}

/** Optional ETA from metadata when the column is not on `orders`. */
export function resolveOrderEstimatedDelivery(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  const value = (metadata as Record<string, unknown>).estimated_delivery_at;
  return typeof value === "string" ? value : null;
}
