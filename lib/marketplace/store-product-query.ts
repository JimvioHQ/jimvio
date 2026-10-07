/**
 * Store page product search/sort helpers.
 * Querying remains vendor-scoped — never marketplace-wide.
 */

export const STORE_PRODUCT_SORTS = [
  "newest",
  "price_asc",
  "price_desc",
  "sales",
] as const;

export type StoreProductSort = (typeof STORE_PRODUCT_SORTS)[number];

export const STORE_PRODUCT_SORT_LABELS: Record<StoreProductSort, string> = {
  newest: "Newest",
  price_asc: "Price: Low to High",
  price_desc: "Price: High to Low",
  sales: "Best Selling",
};

export const DEFAULT_STORE_PRODUCT_SORT: StoreProductSort = "newest";
export const DEFAULT_STORE_PRODUCT_PAGE_SIZE = 24;

export function parseStoreProductSort(
  value: string | string[] | null | undefined,
): StoreProductSort {
  const raw = Array.isArray(value) ? value[0] : value;
  const normalized = (raw ?? "").trim().toLowerCase();
  if ((STORE_PRODUCT_SORTS as readonly string[]).includes(normalized)) {
    return normalized as StoreProductSort;
  }
  // Legacy UI labels / aliases
  if (normalized === "bestselling" || normalized === "best_selling") return "sales";
  if (normalized === "price_low" || normalized === "price-asc") return "price_asc";
  if (normalized === "price_high" || normalized === "price-desc") return "price_desc";
  return DEFAULT_STORE_PRODUCT_SORT;
}

export function parseStoreSearchQuery(
  value: string | string[] | null | undefined,
): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return (raw ?? "").trim().slice(0, 120);
}

export function parseStorePage(
  value: string | string[] | null | undefined,
): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(Math.floor(n), 500);
}

/** Escape LIKE wildcards and commas used in PostgREST or() filters. */
export function sanitizeStoreSearchTerm(query: string): string {
  return query
    .replace(/[%_,.()]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

export function buildStoreProductsHref(opts: {
  slug: string;
  q?: string;
  sort?: StoreProductSort;
  page?: number;
}): string {
  const params = new URLSearchParams();
  const q = (opts.q ?? "").trim();
  const sort = opts.sort ?? DEFAULT_STORE_PRODUCT_SORT;
  const page = opts.page ?? 1;
  if (q) params.set("q", q);
  if (sort !== DEFAULT_STORE_PRODUCT_SORT) params.set("sort", sort);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/vendors/${opts.slug}?${qs}` : `/vendors/${opts.slug}`;
}

/**
 * Pure sorter for unit tests / in-memory fixtures.
 * Production listing uses DB order by the same fields.
 */
export function sortStoreProductsInMemory<
  T extends { price?: number | null; created_at?: string | null; sale_count?: number | null },
>(products: T[], sort: StoreProductSort): T[] {
  const copy = [...products];
  switch (sort) {
    case "price_asc":
      return copy.sort((a, b) => Number(a.price ?? 0) - Number(b.price ?? 0));
    case "price_desc":
      return copy.sort((a, b) => Number(b.price ?? 0) - Number(a.price ?? 0));
    case "sales":
      return copy.sort(
        (a, b) => Number(b.sale_count ?? 0) - Number(a.sale_count ?? 0),
      );
    case "newest":
    default:
      return copy.sort((a, b) => {
        const ta = new Date(a.created_at ?? 0).getTime();
        const tb = new Date(b.created_at ?? 0).getTime();
        return tb - ta;
      });
  }
}

export function filterStoreProductsInMemory<
  T extends {
    name?: string | null;
    sku?: string | null;
    short_description?: string | null;
    vendor_id?: string | null;
  },
>(products: T[], vendorId: string, query: string): T[] {
  const q = sanitizeStoreSearchTerm(query).toLowerCase();
  const scoped = products.filter((p) => p.vendor_id === vendorId);
  if (!q) return scoped;
  return scoped.filter((p) => {
    const hay = [
      p.name ?? "",
      p.sku ?? "",
      p.short_description ?? "",
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}
