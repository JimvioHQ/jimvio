import {
  filterStorefrontVariants,
  requiresPurchasableVariantSelection,
} from "@/lib/products/storefront-variants";
import { normalizeCjVid } from "@/lib/cj/variant-vid";
import { isCJSource, normalizeProductSource } from "@/lib/sources/product-source";

type VariantRow = {
  id: string;
  cj_vid?: string | null;
  cj_pid?: string | null;
  price?: number | string | null;
  inventory_quantity?: number | null;
  source_metadata?: unknown;
  weight?: number | null;
  source?: string | null;
  options?: unknown;
  is_active?: boolean | null;
};

type ProductRow = {
  id: string;
  price: number | string | null;
  source?: string | null;
  source_metadata?: unknown;
  track_inventory?: boolean | null;
  inventory_quantity?: number | null;
};

export type PurchaseLineResolution =
  | {
      ok: true;
      variantId: string | null;
      cjVid: string | null;
      cjPid: string | null;
      variantWeight: number | null;
      price: number;
      inventoryQty: number;
      pendingVariantSelection: boolean;
    }
  | { ok: false; error: string };

function metaString(
  meta: unknown,
  key: string,
): string | null {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return null;
  const value = (meta as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function variantCjVid(variant: VariantRow | null | undefined): string | null {
  if (!variant) return null;
  return (
    normalizeCjVid(variant.cj_vid) ??
    normalizeCjVid(metaString(variant.source_metadata, "cj_vid"))
  );
}

/**
 * Resolve the purchasable line for Add to Cart / Buy Now.
 * Single-SKU CJ products do not require a picker; multi-option products do.
 * CJ orders always require a real cj_vid — never a placeholder.
 */
export function resolvePurchaseLine(input: {
  product: ProductRow;
  variants: VariantRow[];
  selectedVariantId?: string | null;
  allowPendingVariant?: boolean;
}): PurchaseLineResolution {
  const productSource = normalizeProductSource(input.product.source);
  const isCJ = isCJSource(productSource);
  const productMeta = input.product.source_metadata;
  const active = (input.variants ?? []).filter((row) => row.is_active !== false);
  const storefront = filterStorefrontVariants(
    active,
    Boolean(input.product.track_inventory),
  );
  const optionSource = storefront.length > 0 ? storefront : active;
  const needsSelection = requiresPurchasableVariantSelection(optionSource);

  let variant: VariantRow | null = null;
  const selectedId = input.selectedVariantId?.trim() || null;
  if (selectedId) {
    variant = active.find((row) => row.id === selectedId) ?? null;
    if (!variant) {
      return { ok: false, error: "Selected option is no longer available" };
    }
  } else if (!needsSelection) {
    variant = storefront[0] ?? (active.length === 1 ? active[0] ?? null : null);
  }

  const pendingVariantSelection = Boolean(
    input.allowPendingVariant && needsSelection && !variant,
  );

  if (needsSelection && !variant && !pendingVariantSelection) {
    return { ok: false, error: "Please select your options first" };
  }

  if (isCJ && !variant && !pendingVariantSelection && active.length > 1 && storefront.length === 0) {
    return { ok: false, error: "This product is currently out of stock" };
  }

  let cjVid = variantCjVid(variant);
  let cjPid =
    metaString(variant?.source_metadata, "cj_pid") ??
    variant?.cj_pid ??
    metaString(productMeta, "cj_pid");
  let variantWeight = variant?.weight ?? null;

  if (isCJ && !cjVid && !pendingVariantSelection) {
    cjVid = normalizeCjVid(metaString(productMeta, "cj_vid"));
    if (!variantWeight) {
      const weight = metaString(productMeta, "cj_weight");
      const numeric = Number(
        (productMeta && typeof productMeta === "object" && !Array.isArray(productMeta)
          ? (productMeta as Record<string, unknown>).cj_weight
          : null) ?? weight,
      );
      variantWeight = Number.isFinite(numeric) && numeric > 0 ? numeric : null;
    }
  }

  if (isCJ && !cjVid && !pendingVariantSelection) {
    return {
      ok: false,
      error: "This product is missing supplier SKU information. Please contact support.",
    };
  }

  const price =
    variant && Number(variant.price) > 0
      ? Number(variant.price)
      : Number(input.product.price);

  const inventoryQty = variant
    ? (variant.inventory_quantity ?? 0)
    : (input.product.inventory_quantity ?? 0);

  return {
    ok: true,
    variantId: variant?.id ?? null,
    cjVid,
    cjPid,
    variantWeight,
    price: Number.isFinite(price) ? price : 0,
    inventoryQty,
    pendingVariantSelection,
  };
}
