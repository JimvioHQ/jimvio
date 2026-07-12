/**
 * Homepage & marketplace product ranking — reusable priority scoring and fallback selection.
 * Ensures sections never render empty while published marketplace inventory exists.
 */

import {
  filterProductsForCustomers,
  type MarketplaceVisibilitySets,
} from "@/lib/cj/premium-intelligence/marketplace-filter";

export const HOMEPAGE_TRENDING_LIMIT = 24;
export const HOMEPAGE_FLASH_DEALS_LIMIT = 12;

export type RankableMarketplaceProduct = {
  id: string;
  status?: string | null;
  is_active?: boolean | null;
  auto_unpublished?: boolean | null;
  deleted_at?: string | null;
  product_type?: string | null;
  is_flash_deal?: boolean | null;
  compare_at_price?: number | null;
  price?: number | null;
  view_count?: number | null;
  sale_count?: number | null;
  rating?: number | null;
  review_count?: number | null;
  delivery_time?: string | null;
  created_at?: string | null;
  vendors?: { verification_status?: string | null } | null;
  source?: string | null;
  source_metadata?: unknown;
  published_by_admin_override?: boolean | null;
};

function isPublishedActive(p: RankableMarketplaceProduct): boolean {
  return (
    p.status === "active" &&
    p.is_active !== false &&
    p.auto_unpublished !== true &&
    p.deleted_at == null
  );
}

function hasDiscount(p: RankableMarketplaceProduct): boolean {
  const compare = Number(p.compare_at_price ?? 0);
  const price = Number(p.price ?? 0);
  return compare > 0 && compare > price;
}

function parseDeliveryDays(deliveryTime?: string | null): number | null {
  if (!deliveryTime) return null;
  const n = parseInt(deliveryTime, 10);
  return Number.isNaN(n) ? null : n;
}

function createdAtMs(p: RankableMarketplaceProduct): number {
  if (!p.created_at) return 0;
  const t = Date.parse(p.created_at);
  return Number.isNaN(t) ? 0 : t;
}

/** Composite priority — higher is better. Does not require is_trending or featured flags. */
export function computeHomepagePriorityScore(
  product: RankableMarketplaceProduct,
  hasVideo = false,
): number {
  let score = 0;

  if (isPublishedActive(product)) score += 1_000;

  if (hasVideo) score += 120;
  if (product.vendors?.verification_status === "verified") score += 80;

  const rating = Number(product.rating ?? 0);
  score += rating * 15;

  const reviewCount = Number(product.review_count ?? 0);
  score += Math.min(40, reviewCount * 2);

  const viewCount = Number(product.view_count ?? 0);
  score += Math.min(60, viewCount / 50);

  const saleCount = Number(product.sale_count ?? 0);
  score += Math.min(50, saleCount * 2);

  const days = parseDeliveryDays(product.delivery_time);
  if (days !== null && days <= 7) score += 40;
  else if (days !== null && days <= 14) score += 20;

  if (product.is_flash_deal === true) score += 30;
  if (hasDiscount(product)) score += 25;

  return score;
}

export function sortByHomepagePriority<T extends RankableMarketplaceProduct>(
  products: T[],
  videoIds: Set<string> = new Set(),
): T[] {
  return [...products].sort((a, b) => {
    const scoreDiff =
      computeHomepagePriorityScore(b, videoIds.has(b.id)) -
      computeHomepagePriorityScore(a, videoIds.has(a.id));
    if (scoreDiff !== 0) return scoreDiff;
    return createdAtMs(b) - createdAtMs(a);
  });
}

export function dedupeProductsById<T extends { id: string }>(products: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const p of products) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    out.push(p);
  }
  return out;
}

export type ProductIdentityFields = {
  id: string;
  sku?: string | null;
  cj_product_id?: string | null;
  pid?: string | null;
  source_metadata?: unknown;
};

function readMetaString(meta: unknown, ...keys: string[]): string | null {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return null;
  const record = meta as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

/** Collect dedupe keys for product.id, cj_product_id, pid, and sku. */
export function getProductDedupeKeys(product: ProductIdentityFields): string[] {
  const keys = new Set<string>([`id:${product.id}`]);

  const sku = typeof product.sku === "string" ? product.sku.trim() : "";
  if (sku) keys.add(`sku:${sku}`);

  const cjProductId =
    (typeof product.cj_product_id === "string" ? product.cj_product_id.trim() : "") ||
    readMetaString(product.source_metadata, "cj_product_id", "cjProductId");
  if (cjProductId) keys.add(`cj_product_id:${cjProductId}`);

  const pid =
    (typeof product.pid === "string" ? product.pid.trim() : "") ||
    readMetaString(product.source_metadata, "cj_pid", "pid", "cjPid");
  if (pid) keys.add(`pid:${pid}`);

  return [...keys];
}

/** Deduplicate by product.id, cj_product_id, pid, and sku — keeps first occurrence. */
export function dedupeProductsByIdentity<T extends ProductIdentityFields>(
  products: T[],
): T[] {
  const seen = new Set<string>();
  const out: T[] = [];

  for (const product of products) {
    const keys = getProductDedupeKeys(product);
    if (keys.some((key) => seen.has(key))) continue;
    for (const key of keys) seen.add(key);
    out.push(product);
  }

  return out;
}

/**
 * Rank products and return up to `limit` unique items.
 * Fills remaining slots with the next ranked published products when duplicates are skipped.
 */
export function selectUniqueTrendingProducts<T extends RankableMarketplaceProduct & ProductIdentityFields>(
  pool: T[],
  limit = HOMEPAGE_TRENDING_LIMIT,
  videoIds: Set<string> = new Set(),
): T[] {
  if (!pool.length || limit <= 0) return [];

  const ranked = sortByHomepagePriority(pool, videoIds);
  const seen = new Set<string>();
  const out: T[] = [];

  for (const product of ranked) {
    const keys = getProductDedupeKeys(product);
    if (keys.some((key) => seen.has(key))) continue;
    for (const key of keys) seen.add(key);
    out.push(product);
    if (out.length >= limit) break;
  }

  return out;
}

/**
 * Strict CJ visibility first; if that yields nothing while listings exist,
 * fall back to published active products (never return [] when inventory exists).
 */
export function resolveMarketplaceProductPool<T extends RankableMarketplaceProduct>(
  raw: T[],
  sets: MarketplaceVisibilitySets,
  listingCount: number,
): T[] {
  const strict = filterProductsForCustomers(raw, sets).filter(isPublishedActive);
  if (strict.length > 0) return strict;
  if (listingCount === 0) return [];

  const relaxed = raw.filter(isPublishedActive);
  return relaxed.length > 0 ? relaxed : [];
}

/** Trending row — all eligible products ranked; no trending flag required. */
export function selectTrendingProducts<T extends RankableMarketplaceProduct & ProductIdentityFields>(
  pool: T[],
  limit = HOMEPAGE_TRENDING_LIMIT,
  videoIds: Set<string> = new Set(),
): T[] {
  return selectUniqueTrendingProducts(pool, limit, videoIds);
}

/**
 * Flash deals carousel — real deals first, then discounts, then highest score, then newest.
 */
export function selectFlashDeals<T extends RankableMarketplaceProduct>(
  pool: T[],
  limit = HOMEPAGE_FLASH_DEALS_LIMIT,
  videoIds: Set<string> = new Set(),
): T[] {
  if (!pool.length) return [];

  const flash = pool.filter((p) => p.is_flash_deal === true);
  if (flash.length > 0) {
    return sortByHomepagePriority(flash, videoIds).slice(0, limit);
  }

  const discounted = pool.filter(hasDiscount);
  if (discounted.length > 0) {
    return sortByHomepagePriority(discounted, videoIds).slice(0, limit);
  }

  return sortByHomepagePriority(pool, videoIds).slice(0, limit);
}

export function selectHeroProduct<T extends RankableMarketplaceProduct>(
  pool: T[],
  videoIds: Set<string> = new Set(),
): T | null {
  if (!pool.length) return null;
  return sortByHomepagePriority(pool, videoIds)[0] ?? null;
}

export function ensureNonEmptyCollection<T extends RankableMarketplaceProduct>(
  selected: T[],
  pool: T[],
  picker: (items: T[]) => T[],
  limit: number,
  listingCount: number,
): T[] {
  if (selected.length > 0) return selected.slice(0, limit);
  if (listingCount === 0 || pool.length === 0) return [];
  return picker(pool).slice(0, limit);
}

/** Flash deals — real deals first, then discounts, then top-ranked pool; never empty when inventory exists. */
export function resolveMarketplaceFlashDeals<
  T extends RankableMarketplaceProduct & ProductIdentityFields,
>(
  pool: T[],
  listingCount: number,
  limit = HOMEPAGE_FLASH_DEALS_LIMIT,
  videoIds: Set<string> = new Set(),
): T[] {
  if (listingCount === 0 || pool.length === 0) return [];

  let flashDeals = dedupeProductsByIdentity(selectFlashDeals(pool, limit, videoIds));
  flashDeals = ensureNonEmptyCollection(
    flashDeals,
    pool,
    (items) => dedupeProductsByIdentity(selectFlashDeals(items, limit, videoIds)),
    limit,
    listingCount,
  );
  return flashDeals.slice(0, limit);
}
