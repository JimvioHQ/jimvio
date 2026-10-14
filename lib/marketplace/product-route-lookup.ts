/**
 * Storefront product URL resolution.
 * Exact slug first, then a unique CJ SKU, then one unambiguous long-slug prefix.
 * Callers still apply publication and visibility filters.
 */

export type ProductRouteLookup =
  | { kind: "slug"; slug: string }
  | { kind: "sku"; sku: string }
  | { kind: "slug-prefix"; prefix: string };

const CJ_SKU = /^cj[a-z0-9]{5,24}$/i;
/** slugify() historically capped titles at 100 characters, cutting the SKU off. */
const LONG_SLUG_PREFIX = 90;

export function decodeProductRouteParam(raw: string): string {
  const trimmed = raw.trim().replace(/^\/+|\/+$/g, "");
  try {
    return decodeURIComponent(trimmed);
  } catch {
    return trimmed;
  }
}

export function escapeLikePrefix(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

export function cjSkuFromRouteSlug(slug: string): string | null {
  if (CJ_SKU.test(slug)) return slug.toUpperCase();
  const match = slug.match(/-(cj[a-z0-9]{5,24})$/i);
  return match ? match[1].toUpperCase() : null;
}

export function isStorefrontVisibleProduct(row: {
  status?: string | null;
  is_active?: boolean | null;
  deleted_at?: string | null;
}): boolean {
  return row.status === "active" && row.is_active === true && row.deleted_at == null;
}

/**
 * Ordered lookups for a marketplace product URL.
 * Prefix search is only offered for long slugs so a short fragment cannot scan the catalog.
 */
export function productRouteLookups(raw: string): ProductRouteLookup[] {
  const slug = decodeProductRouteParam(raw);
  if (!slug || slug.length > 240) return [];

  const lookups: ProductRouteLookup[] = [{ kind: "slug", slug }];
  const sku = cjSkuFromRouteSlug(slug);
  if (sku) lookups.push({ kind: "sku", sku });
  if (slug.length >= LONG_SLUG_PREFIX) {
    lookups.push({ kind: "slug-prefix", prefix: slug });
  }
  return lookups;
}

export function isProductLookupTimeout(error: { code?: string | null; message?: string | null } | null | undefined): boolean {
  if (!error) return false;
  return error.code === "57014" || /statement timeout/i.test(error.message ?? "");
}

export class ProductLookupUnavailable extends Error {
  constructor() {
    super("Product lookup timed out");
    this.name = "ProductLookupUnavailable";
  }
}
