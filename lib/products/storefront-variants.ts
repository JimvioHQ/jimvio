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

type VariantWithOptions = StorefrontVariantLike & {
  options?: Record<string, unknown> | null | unknown;
};

const IGNORED_VARIANT_OPTION_KEYS = new Set([
  "variant_key",
  "sku",
  "size_label",
  "vid",
  "pid",
  "cj_vid",
  "cj_pid",
]);

const PURCHASABLE_OPTION_KEY_HINTS = [
  "color",
  "colour",
  "size",
  "style",
  "model",
  "storage",
  "capacity",
  "material",
  "pattern",
  "length",
  "width",
  "type",
];

function isPurchasableOptionKey(key: string): boolean {
  const lower = key.toLowerCase().trim();
  if (!lower || IGNORED_VARIANT_OPTION_KEYS.has(lower)) return false;
  return PURCHASABLE_OPTION_KEY_HINTS.some(
    (hint) => lower === hint || lower.includes(hint),
  );
}

function normalizeVariantOptions(
  options: VariantWithOptions["options"],
): Record<string, string> {
  if (!options || typeof options !== "object" || Array.isArray(options)) return {};
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(options)) {
    if (!isPurchasableOptionKey(key)) continue;
    const trimmed = String(value ?? "").trim();
    if (trimmed) normalized[key] = trimmed;
  }
  return normalized;
}

/**
 * True only when the buyer must pick among multiple distinct option values
 * (e.g. Color: Black vs White). Variants with no option axes, or a single
 * purchasable SKU, do not require selection.
 */
export function requiresPurchasableVariantSelection(
  variants: VariantWithOptions[] | null | undefined,
): boolean {
  const active = (variants ?? []).filter((v) => v.is_active !== false);
  if (active.length <= 1) return false;

  const valuesByKey = new Map<string, Set<string>>();
  for (const variant of active) {
    for (const [key, value] of Object.entries(normalizeVariantOptions(variant.options))) {
      if (!valuesByKey.has(key)) valuesByKey.set(key, new Set());
      valuesByKey.get(key)!.add(value);
    }
  }

  for (const values of valuesByKey.values()) {
    if (values.size > 1) return true;
  }

  return false;
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
