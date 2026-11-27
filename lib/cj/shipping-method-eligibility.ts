/**
 * CJ shipping lanes can be product-restricted even when the freight quote API
 * lists them for a destination. Never offer or submit a liquid-only lane for
 * ordinary products.
 */
type CjShippingProductFacts = {
  product_name?: unknown;
  productName?: unknown;
  name?: unknown;
  source_metadata?: unknown;
  sourceMetadata?: unknown;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function isCjLiquidProduct(item: CjShippingProductFacts): boolean {
  const metadata = asRecord(item.source_metadata ?? item.sourceMetadata);
  const productType = String(metadata.cj_product_type ?? "").toUpperCase();
  const rawNames = Array.isArray(metadata.cj_product_names_raw)
    ? metadata.cj_product_names_raw.join(" ")
    : "";
  const searchable = [
    item.product_name,
    item.productName,
    item.name,
    metadata.cj_category_name,
    metadata.category_name,
    metadata.shipping_category,
    metadata.description,
    rawNames,
  ]
    .filter((value): value is string => typeof value === "string")
    .join(" ");

  if (/LIQUID/i.test(productType)) return true;
  return /\b(perfume|fragrance|essential oils?|shampoo|conditioner|lotion|serum|gel|detergent|cleaner|nail polish|ink|paint|spray|beverage|drink|sauce|syrup|juice|cream|glue|adhesive|liquid soap|liquid detergent|liquid cleaner|liquid makeup)\b/i.test(searchable);
}

export function isCjShippingMethodEligible(
  methodName: string,
  items: CjShippingProductFacts[],
): boolean {
  if (!/\bliquid\b/i.test(methodName)) return true;
  return items.length > 0 && items.every(isCjLiquidProduct);
}
