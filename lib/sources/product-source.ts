export const PRODUCT_SOURCES = ["vendor", "shopify", "cj"] as const;
export type ProductSource = (typeof PRODUCT_SOURCES)[number];

export function isProductSource(s: string): s is ProductSource {
  return (PRODUCT_SOURCES as readonly string[]).includes(s);
}

export function normalizeProductSource(raw: string | null | undefined): ProductSource {
  const s = (raw || "vendor").toLowerCase().trim();
  if (s === "jimvio") return "vendor";
  if (isProductSource(s)) return s;
  return "vendor";
}

export function fulfillmentLabel(source: ProductSource): string {
  switch (source) {
    case "shopify": return "Shopify";
    case "cj":      return "International";
    default:        return "Vendor";
  }
}


export function isExternalFulfillment(source: ProductSource): boolean {
  return source === "cj" || source === "shopify";
}

export function isCJSource(source: ProductSource | string | null | undefined): boolean {
  return normalizeProductSource(source as string) === "cj";
}

export function toOrderItemSource(productSource: string | null | undefined): ProductSource {
  return normalizeProductSource(productSource);
}

/**
 * Affiliate commissions are allowed for any source when the product opts in.
 * CJ products use affiliate_price (absolute) when present; otherwise rate × line total.
 * Enabling commissions does NOT trigger CJ fulfillment — fulfillment stays payment-driven.
 */
export function supportsAffiliateCommission(
  _source: ProductSource,
  affiliateEnabled: boolean
): boolean {
  return Boolean(affiliateEnabled);
}