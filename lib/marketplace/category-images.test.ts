import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getCategoryImageSrc } from "./category-images.ts";

// The live top-level physical categories shown in "Shop by Category".
const PHYSICAL = [
  ["Automobiles & Motorcycles", "automobiles-motorcycles"],
  ["Bags & Shoes", "bags-shoes"],
  ["Consumer Electronics", "consumer-electronics"],
  ["Health & Beauty, Hair", "health-beauty-hair"],
  ["Home Improvement", "home-improvement"],
  ["Home, Garden & Furniture", "home-garden-furniture"],
  ["Jewelry & Watches", "jewelry-watches"],
  ["Men's Clothing", "mens-clothing"],
  ["Pet Supplies", "pet-supplies"],
  ["Phones & Accessories", "phones-accessories"],
  ["Sports & Outdoors", "sports-outdoors"],
  ["Toys, Kids & Baby", "toys-kids-baby"],
  ["Women's Clothing", "womens-clothing"],
] as const;

describe("physical category images", () => {
  it("gives every shop category its own picture", () => {
    const urls = PHYSICAL.map(([name, slug]) => getCategoryImageSrc(name, slug));
    assert.equal(new Set(urls).size, urls.length, urls.join("\n"));
  });

  it("keeps women's and men's clothing apart even without a slug", () => {
    assert.match(getCategoryImageSrc("Women's Clothing"), /Women's Clothing/);
    assert.match(getCategoryImageSrc("Men's Clothing"), /Men's Clothing/);
  });
});
