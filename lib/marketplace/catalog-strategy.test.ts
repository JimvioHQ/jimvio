import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decideRefresh, isRemoval, STRATEGY_CATEGORIES } from "@/lib/marketplace/catalog-strategy";
import { isPermanentUnpublishReason, CATALOG_REFRESH_UNPUBLISH_REASON } from "@/lib/cj/import-intelligence/progressive-publish";

const base = { inStrategy: false, isTrending: false, hasVideo: false, views: 0, priceUsd: 8, imageCount: 5, duplicateRank: 1 };

describe("catalog strategy 2026–2030", () => {
  it("covers 8 focus categories totalling a 200-product first catalog", () => {
    assert.equal(STRATEGY_CATEGORIES.length, 8);
    assert.equal(STRATEGY_CATEGORIES.reduce((sum, c) => sum + c.target, 0), 200);
    assert.ok(STRATEGY_CATEGORIES.every((c) => c.keywords.length >= 5));
  });

  it("keeps strategic and demonstrably popular products", () => {
    assert.equal(decideRefresh({ ...base, inStrategy: true }), "keep_strategic");
    assert.equal(decideRefresh({ ...base, isTrending: true }), "keep_trending");
    assert.equal(decideRefresh({ ...base, hasVideo: true }), "keep_trending");
    assert.equal(decideRefresh({ ...base, views: 3 }), "keep_trending");
  });

  it("takes off duplicates, no-signal low-value items, weak listings and off-strategy items", () => {
    assert.equal(decideRefresh({ ...base, inStrategy: true, duplicateRank: 2 }), "remove_duplicate");
    assert.equal(decideRefresh({ ...base, inStrategy: true, priceUsd: 1.2 }), "remove_low_value");
    assert.equal(decideRefresh({ ...base, inStrategy: true, priceUsd: 1.2, isTrending: true }), "keep_strategic");
    assert.equal(decideRefresh({ ...base, inStrategy: true, imageCount: 2 }), "remove_weak_photos");
    assert.equal(decideRefresh(base), "remove_off_strategy");
    assert.ok(isRemoval("remove_off_strategy") && !isRemoval("keep_trending"));
  });

  it("catalog-refresh removals are never auto-restored", () => {
    assert.equal(isPermanentUnpublishReason(CATALOG_REFRESH_UNPUBLISH_REASON), true);
    assert.equal(isPermanentUnpublishReason("Low score"), false);
  });
});
