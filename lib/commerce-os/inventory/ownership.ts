const SUPPLIER_SOURCES = new Set([
  "cj",
  "shopify",
  "dropship",
  "dropshipping",
  "supplier",
  "aliexpress",
  "marketplace_import",
]);

function metaFlag(meta: Record<string, unknown> | null | undefined, key: string): boolean {
  const value = meta?.[key];
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return Number.isFinite(value);
  return false;
}

/**
 * Merchant stock edits are only valid when this store owns the product row
 * and the product is not a supplier-controlled import.
 */
export function merchantCanAdjustStock(input: {
  productVendorId: string | null | undefined;
  merchantVendorId: string;
  source?: string | null;
  sourceMetadata?: Record<string, unknown> | null;
}): boolean {
  if (!input.productVendorId || input.productVendorId !== input.merchantVendorId) {
    return false;
  }
  const source = (input.source || "vendor").toLowerCase();
  if (SUPPLIER_SOURCES.has(source)) return false;
  const meta = input.sourceMetadata ?? null;
  if (
    metaFlag(meta, "cj_pid") ||
    metaFlag(meta, "cj_vid") ||
    metaFlag(meta, "supplier_sku") ||
    metaFlag(meta, "supplier_id")
  ) {
    return false;
  }
  return true;
}
