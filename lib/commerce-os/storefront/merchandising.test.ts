import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { productsOnSale } from "./sale-products.ts";
import { storefrontCartItemCount } from "./cart-count.ts";
import { splitHeadlineAccent } from "./headline.ts";
import { categoryNavTiles, sliceCollectionsForSection } from "./collection-slice.ts";

describe("storefront merchandising helpers", () => {
  it("keeps only products with a valid compare-at discount", () => {
    const list = productsOnSale([
      { id: "a", price: 40, compare_at_price: 80 },
      { id: "b", price: 20, compare_at_price: 20 },
      { id: "c", price: 15, compare_at_price: null },
    ]);
    assert.deepEqual(list.map((p) => p.id), ["a"]);
  });

  it("counts store cart quantity without inventing items", () => {
    assert.equal(storefrontCartItemCount([]), 0);
    assert.equal(
      storefrontCartItemCount([{ quantity: 2 }, { quantity: "3" }, { quantity: 0 }]),
      5
    );
  });

  it("splits a merchant-provided headline accent", () => {
    const split = splitHeadlineAccent(
      "Quality Products for a Better You",
      "for a Better You"
    );
    assert.equal(split.lead, "Quality Products");
    assert.equal(split.accent, "for a Better You");
    assert.equal(splitHeadlineAccent("Hello", "").accent, null);
  });

  it("builds category tiles with an All shortcut plus published collections", () => {
    const tiles = categoryNavTiles([
      { id: "c1", title: "Fashion", handle: "fashion", image_url: null },
    ]);
    assert.equal(tiles[0]?.handle, "all");
    assert.equal(tiles[1]?.title, "Fashion");
  });

  it("orders collections by merchant-selected ids", () => {
    const out = sliceCollectionsForSection(
      [
        { id: "a", title: "A", handle: "a" },
        { id: "b", title: "B", handle: "b" },
        { id: "c", title: "C", handle: "c" },
      ],
      { collectionIds: ["c", "a"], limit: 8 }
    );
    assert.deepEqual(out.map((c) => c.id), ["c", "a"]);
  });
});
