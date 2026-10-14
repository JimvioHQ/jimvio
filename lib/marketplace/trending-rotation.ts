import { getProductDedupeKeys, type ProductIdentityFields } from "@/lib/marketplace/homepage-ranking";

export type TrendingEligibility = {
  status?: string | null;
  is_active?: boolean | null;
  deleted_at?: string | null;
  auto_unpublished?: boolean | null;
};

/** Published listings shoppers are allowed to see. */
export function isEligibleMarketplaceListing(product: TrendingEligibility): boolean {
  return (
    product.status === "active" &&
    product.is_active !== false &&
    product.deleted_at == null &&
    product.auto_unpublished !== true
  );
}

/** Stable unsigned hash so the same visit seed always picks the same window. */
export function hashVisitSeed(seed: string): number {
  let hash = 2166136261;
  const value = seed.trim() || "marketplace";
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function normalizeVisitSeed(raw: string | null | undefined): string {
  const seed = (raw ?? "").trim().slice(0, 80);
  if (!/^[A-Za-z0-9:_-]{8,80}$/.test(seed)) {
    return `visit-${Date.now().toString(36)}`;
  }
  return seed;
}

/**
 * Rotate a ranked eligible pool.
 * A short anchor of the strongest products stays visible; the remaining slots
 * slide through the rest of the pool so a new visit is not an identical grid.
 */
export function selectRotatedTrending<T extends ProductIdentityFields>(
  ranked: T[],
  seed: string,
  limit: number,
): T[] {
  const size = Math.max(0, Math.floor(limit));
  if (size === 0) return [];

  const seen = new Set<string>();
  const unique: T[] = [];
  for (const product of ranked) {
    if (!product?.id) continue;
    const keys = getProductDedupeKeys(product);
    if (keys.some((key) => seen.has(key))) continue;
    for (const key of keys) seen.add(key);
    unique.push(product);
  }

  if (unique.length <= size) return unique;

  const anchorCount = Math.min(6, Math.max(1, Math.floor(size / 4)));
  const anchors = unique.slice(0, anchorCount);
  const rest = unique.slice(anchorCount);
  const slots = size - anchors.length;
  if (rest.length <= slots) return [...anchors, ...rest].slice(0, size);

  const start = hashVisitSeed(seed) % (rest.length - slots + 1);
  return [...anchors, ...rest.slice(start, start + slots)];
}
