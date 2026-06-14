/** Minimal variant shape for storefront availability checks. */
export type StorefrontVariantLike = {
  is_active?: boolean | null;
  inventory_quantity?: number | null;
};

/**
 * Whether a variant should appear on the storefront.
 * When inventory is tracked, zero-stock variants are hidden (not shown as disabled).
 */
export function isStorefrontVariantVisible(
  variant: StorefrontVariantLike,
  trackInventory: boolean
): boolean {
  if (variant.is_active === false) return false;
  if (!trackInventory) return true;
  return (variant.inventory_quantity ?? 0) > 0;
}

/** Active, in-stock variants for buyer-facing UI. */
export function filterStorefrontVariants<T extends StorefrontVariantLike>(
  variants: T[] | null | undefined,
  trackInventory: boolean
): T[] {
  return (variants ?? []).filter((v) => isStorefrontVariantVisible(v, trackInventory));
}

/** Map DB variants to storefront list with optional track_inventory on parent product. */
export function filterProductVariantsForStorefront<
  T extends StorefrontVariantLike,
  P extends { track_inventory?: boolean | null; product_variants?: T[] | null },
>(product: P): P {
  const trackInventory = Boolean(product.track_inventory);
  return {
    ...product,
    product_variants: filterStorefrontVariants(product.product_variants, trackInventory),
  };
}
