export interface CjCatalogProductState {
  id: string;
  status: string | null;
  is_active: boolean | null;
  deleted_at: string | null;
}

export interface CjCatalogMapping {
  cj_pid: string;
  product_id: string;
}

export function isLiveMarketplaceProduct(product: CjCatalogProductState): boolean {
  return (
    (product.status === "active" || product.status === "published") &&
    product.is_active !== false &&
    product.deleted_at == null
  );
}

/**
 * Keep supplier catalog cache rows only for CJ products already represented by
 * a live Jimvio Marketplace product. Unimported supplier rows are fetched from
 * CJ on demand when a selected PID is explicitly imported.
 */
export function filterLiveMappedCjRows<T extends { pid: string }>(
  rows: readonly T[],
  mappings: readonly CjCatalogMapping[],
  products: readonly CjCatalogProductState[],
): T[] {
  if (rows.length === 0 || mappings.length === 0 || products.length === 0) return [];

  const liveProductIds = new Set(
    products.filter(isLiveMarketplaceProduct).map((product) => product.id),
  );
  if (liveProductIds.size === 0) return [];

  const livePids = new Set(
    mappings
      .filter((mapping) => liveProductIds.has(mapping.product_id))
      .map((mapping) => mapping.cj_pid),
  );

  return rows.filter((row) => livePids.has(row.pid));
}
