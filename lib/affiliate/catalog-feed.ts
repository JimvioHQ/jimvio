export const AFFILIATE_CATALOG_PAGE_SIZE = 10;
export const AFFILIATE_CATALOG_MAX_LIMIT = 40;

export type AffiliateFeedPage<T> = {
  products: T[];
  offset: number;
  limit: number;
  total: number | null;
  hasMore?: boolean;
};

export type AffiliateFeedMerge<T> = {
  items: T[];
  seen: Set<string>;
  nextOffset: number;
  hasMore: boolean;
  added: number;
  firstAddedId: string | null;
};

export function affiliateProductWindow(offset: number, limit: number): {
  limit: number;
  offset: number;
  end: number;
} {
  const safeLimit = Math.min(
    AFFILIATE_CATALOG_MAX_LIMIT,
    Math.max(1, Number.isFinite(limit) ? Math.floor(limit) : AFFILIATE_CATALOG_PAGE_SIZE),
  );
  const safeOffset = Math.max(0, Number.isFinite(offset) ? Math.floor(offset) : 0);
  return { limit: safeLimit, offset: safeOffset, end: safeOffset + safeLimit - 1 };
}

export function catalogHasMore(input: {
  loaded: number;
  total: number | null;
  pageSize: number;
}): boolean {
  if (input.loaded <= 0) return false;
  if (input.total == null) return input.loaded >= input.pageSize;
  if (input.total > input.loaded) return true;
  return input.total === 0 && input.loaded >= input.pageSize;
}

export function affiliatePageHasMore(input: {
  offset: number;
  returned: number;
  limit: number;
  total: number | null;
}): boolean {
  if (input.returned <= 0) return false;
  if (input.total == null) return input.returned === input.limit;
  if (input.total === 0) return input.returned === input.limit;
  return input.offset + input.returned < input.total;
}

export function mergeAffiliateCatalogPage<T extends { id: string }>(
  current: T[],
  seen: ReadonlySet<string>,
  page: AffiliateFeedPage<T>,
): AffiliateFeedMerge<T> {
  const nextSeen = new Set(seen);
  const addedItems: T[] = [];
  for (const product of page.products) {
    if (!product?.id || nextSeen.has(product.id)) continue;
    nextSeen.add(product.id);
    addedItems.push(product);
  }
  const nextOffset = Math.max(0, page.offset) + page.products.length;
  const hasMore = affiliatePageHasMore({
    offset: page.offset,
    returned: page.products.length,
    limit: page.limit,
    total: page.total,
  });
  return {
    items: addedItems.length > 0 ? [...current, ...addedItems] : current,
    seen: nextSeen,
    nextOffset,
    hasMore,
    added: addedItems.length,
    firstAddedId: addedItems[0]?.id ?? null,
  };
}

/** One click may skip a duplicate window, then stop. */
export function shouldFollowDuplicatePage(
  result: { added: number; hasMore: boolean },
  follows: number,
): boolean {
  return result.added === 0 && result.hasMore && follows < 2;
}

export function canLoadMoreAffiliateProducts(state: {
  loading: boolean;
  hasMore: boolean;
}): boolean {
  return state.hasMore && !state.loading;
}

export function affiliateFeedErrorMessage(
  body: { error?: unknown } | null,
  ok: boolean,
): string | null {
  if (ok) return null;
  const message = body?.error;
  if (typeof message === "string" && message.length > 0 && message.length < 160) return message;
  return "Could not load more products";
}
