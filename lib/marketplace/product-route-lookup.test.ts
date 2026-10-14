import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  cjSkuFromRouteSlug,
  isProductLookupTimeout,
  isStorefrontVisibleProduct,
  productRouteLookups,
} from "./product-route-lookup.ts";

const HAT =
  "christmas-wool-hat-warm-winter-loose-creative-hand-knitted-santa-parent-child-hat-happy-new-year-cjmz1353704";
const SHOES = "trendy-business-formal-wear-all-match-casual-trendy-shoes-cjns1500094";

describe("product route lookups", () => {
  it("resolves a normal published slug before any fallback", () => {
    const lookups = productRouteLookups("canvas-tote-bag");
    assert.deepEqual(lookups, [{ kind: "slug", slug: "canvas-tote-bag" }]);
  });

  it("keeps the full long slug and can still match its CJ sku", () => {
    const lookups = productRouteLookups(HAT);
    assert.equal(lookups[0].kind, "slug");
    assert.equal(lookups[0].kind === "slug" && lookups[0].slug, HAT);
    assert.equal(cjSkuFromRouteSlug(HAT), "CJMZ1353704");
    assert.ok(lookups.some((item) => item.kind === "sku" && item.sku === "CJMZ1353704"));
    assert.ok(lookups.some((item) => item.kind === "slug-prefix"));
  });

  it("resolves a CJ identifier embedded in the canonical slug", () => {
    const lookups = productRouteLookups(SHOES);
    assert.equal(lookups[0].kind, "slug");
    assert.ok(lookups.some((item) => item.kind === "sku" && item.sku === "CJNS1500094"));
    assert.equal(lookups.some((item) => item.kind === "slug-prefix"), false);
  });

  it("accepts a bare CJ sku as a legacy url", () => {
    assert.deepEqual(productRouteLookups("cjns1500094"), [
      { kind: "slug", slug: "cjns1500094" },
      { kind: "sku", sku: "CJNS1500094" },
    ]);
  });

  it("treats a 100-character truncated slug as a prefix, not a different product", () => {
    const truncated = HAT.slice(0, 100);
    assert.equal(truncated.endsWith("cjm"), true);
    const lookups = productRouteLookups(truncated);
    assert.ok(lookups.some((item) => item.kind === "slug-prefix" && item.prefix === truncated));
    assert.equal(cjSkuFromRouteSlug(truncated), null);
  });

  it("does not prefix-search short or missing routes", () => {
    assert.deepEqual(productRouteLookups("hat"), [{ kind: "slug", slug: "hat" }]);
    assert.deepEqual(productRouteLookups("   "), []);
  });

  it("hides unpublished and deleted rows", () => {
    assert.equal(
      isStorefrontVisibleProduct({ status: "active", is_active: true, deleted_at: null }),
      true,
    );
    assert.equal(
      isStorefrontVisibleProduct({ status: "draft", is_active: true, deleted_at: null }),
      false,
    );
    assert.equal(
      isStorefrontVisibleProduct({ status: "active", is_active: false, deleted_at: null }),
      false,
    );
    assert.equal(
      isStorefrontVisibleProduct({ status: "active", is_active: true, deleted_at: "2026-01-01" }),
      false,
    );
  });

  it("recognises statement timeouts so they are not treated as a missing product", () => {
    assert.equal(isProductLookupTimeout({ code: "57014", message: "canceling statement due to statement timeout" }), true);
    assert.equal(isProductLookupTimeout({ code: "PGRST116", message: "multiple rows" }), false);
    assert.equal(isProductLookupTimeout(null), false);
  });
});
