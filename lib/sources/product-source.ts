/**
 * Unified product / order-line source identifiers — keep fulfillment logic isolated per source.
 * DB: `products.source`, `order_items.product_source`
 */

export const PRODUCT_SOURCES = ["vendor", "shopify", "cj"] as const;

export type ProductSource = (typeof PRODUCT_SOURCES)[number];

export function isProductSource(s: string): s is ProductSource {
  return (PRODUCT_SOURCES as readonly string[]).includes(s);
}

/** Normalize DB labels (legacy `jimvio` → vendor). */
export function normalizeProductSource(raw: string | null | undefined): ProductSource {
  const s = (raw || "vendor").toLowerCase().trim();
  if (s === "jimvio") return "vendor";
  if (isProductSource(s)) return s;
  return "vendor";
}

export function fulfillmentLabel(source: ProductSource): string {
  switch (source) {
    case "shopify":
      return "Shopify";
    case "cj":
      return "CJ Dropshipping";
    default:
      return "Vendor";
  }
}
