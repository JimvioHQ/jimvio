type PendingVariantItem = {
  variant_id: string | null;
  product_source?: string | null;
  source_metadata?: unknown;
  products?: unknown;
};

export function isPendingVariantSelection(item: PendingVariantItem): boolean {
  const meta = (item.source_metadata ?? {}) as Record<string, unknown>;
  if (meta.pending_variant_selection !== true) return false;
  // Resolved lines should never prompt for options.
  if (item.variant_id) return false;
  return true;
}
