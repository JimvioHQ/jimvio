import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  affiliateFeedErrorMessage,
  affiliatePageHasMore,
  affiliateProductWindow,
  canLoadMoreAffiliateProducts,
  catalogHasMore,
  mergeAffiliateCatalogPage,
  shouldFollowDuplicatePage,
} from "./catalog-feed";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function page<T extends { id: string }>(all: T[], offset: number, limit = 10) {
  const products = all.slice(offset, offset + limit);
  return {
    products,
    offset,
    limit,
    total: all.length,
    hasMore: affiliatePageHasMore({
      offset,
      returned: products.length,
      limit,
      total: all.length,
    }),
  };
}

describe("affiliate catalog pagination", () => {
  it("uses an inclusive window and caps the page size", () => {
    assert.deepEqual(affiliateProductWindow(10, 10), { limit: 10, offset: 10, end: 19 });
    assert.deepEqual(affiliateProductWindow(-4, 500), { limit: 40, offset: 0, end: 39 });
  });

  it("loads later pages without skipping or repeating products", () => {
    const all = Array.from({ length: 25 }, (_, index) => ({ id: `p${index}` }));
    let items = all.slice(0, 10);
    let seen = new Set(items.map((item) => item.id));
    let offset = items.length;
    let hasMore = true;
    let guard = 0;
    while (hasMore) {
      const merged = mergeAffiliateCatalogPage(items, seen, page(all, offset));
      items = merged.items;
      seen = merged.seen;
      offset = merged.nextOffset;
      hasMore = merged.hasMore;
      guard += 1;
      assert.ok(guard < 6);
    }
    assert.deepEqual(items.map((item) => item.id), all.map((item) => item.id));
    assert.equal(new Set(items.map((item) => item.id)).size, all.length);
  });

  it("advances past a duplicate page instead of appending the same cards", () => {
    const current = [{ id: "a" }, { id: "b" }];
    const seen = new Set(["a", "b"]);
    const duplicate = mergeAffiliateCatalogPage(current, seen, {
      products: [{ id: "a" }, { id: "b" }],
      offset: 0,
      limit: 2,
      total: 6,
    });
    assert.equal(duplicate.added, 0);
    assert.deepEqual(duplicate.items.map((item) => item.id), ["a", "b"]);
    assert.equal(duplicate.nextOffset, 2);
    assert.equal(duplicate.hasMore, true);
    assert.equal(shouldFollowDuplicatePage(duplicate, 0), true);
    assert.equal(shouldFollowDuplicatePage(duplicate, 2), false);

    const next = mergeAffiliateCatalogPage(duplicate.items, duplicate.seen, {
      products: [{ id: "c" }, { id: "b" }],
      offset: duplicate.nextOffset,
      limit: 2,
      total: 6,
    });
    assert.deepEqual(next.items.map((item) => item.id), ["a", "b", "c"]);
    assert.equal(next.added, 1);
  });

  it("stops at the end of the catalog and surfaces load errors", () => {
    const end = mergeAffiliateCatalogPage([{ id: "a" }], new Set(["a"]), {
      products: [],
      offset: 10,
      limit: 10,
      total: 1,
    });
    assert.equal(end.hasMore, false);
    assert.equal(end.added, 0);
    assert.equal(catalogHasMore({ loaded: 10, total: 10, pageSize: 10 }), false);
    assert.equal(catalogHasMore({ loaded: 10, total: 30, pageSize: 10 }), true);
    assert.equal(catalogHasMore({ loaded: 0, total: 30, pageSize: 10 }), false);
    assert.equal(affiliateFeedErrorMessage(null, false), "Could not load more products");
    assert.equal(affiliateFeedErrorMessage({ error: "Could not load affiliate products" }, false), "Could not load affiliate products");
    assert.equal(affiliateFeedErrorMessage({ error: "x".repeat(200) }, false), "Could not load more products");
    assert.equal(canLoadMoreAffiliateProducts({ loading: true, hasMore: true }), false);
    assert.equal(canLoadMoreAffiliateProducts({ loading: false, hasMore: false }), false);
    assert.equal(canLoadMoreAffiliateProducts({ loading: false, hasMore: true }), true);
  });

  it("keeps affiliate sales pages stable with an id tie-break", () => {
    const source = readFileSync(join(root, "services/products.ts"), "utf8");
    assert.match(source, /if \(affiliate\) q = q\.order\("id", \{ ascending: true \}\)/);
  });
});
