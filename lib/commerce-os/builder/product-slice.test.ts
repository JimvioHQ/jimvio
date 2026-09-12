import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sliceProductsForSection } from "../storefront/product-slice";

describe("sliceProductsForSection", () => {
  const products = [
    { id: "a", name: "A", slug: "a", price: 30 },
    { id: "b", name: "B", slug: "b", price: 10 },
    { id: "c", name: "C", slug: "c", price: 20 },
  ];

  it("respects manual productIds order", () => {
    const out = sliceProductsForSection(products, {
      id: "s1",
      type: "featured_products",
      enabled: true,
      props: { productIds: ["c", "a"], limit: 8 },
    });
    assert.deepEqual(
      out.map((p) => p.id),
      ["c", "a"]
    );
  });

  it("falls back to sort when productIds empty", () => {
    const out = sliceProductsForSection(products, {
      id: "s1",
      type: "featured_products",
      enabled: true,
      props: { sort: "price_asc", limit: 2 },
    });
    assert.deepEqual(
      out.map((p) => p.id),
      ["b", "c"]
    );
  });
});
