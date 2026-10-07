import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  expandSearchTerms,
  resolveMatchedCategoryIds,
  scoreProduct,
  sqlSearchTerms,
  type SearchableCategory,
  type SearchableProduct,
} from "./search-engine";

describe("marketplace search-engine", () => {
  it("does not emit short stems that pollute ILIKE (bag→ba, ring→rin)", () => {
    const bag = expandSearchTerms("bag");
    assert.equal(bag.includes("ba"), false);
    assert.equal(bag.includes("bag"), true);
    assert.equal(bag.some((t) => t.includes("handbag") || t === "backpack"), true);

    const ring = expandSearchTerms("ring");
    assert.equal(ring.includes("rin"), false);
    assert.equal(ring.includes("ring"), true);

    const shoes = expandSearchTerms("shoes");
    assert.equal(shoes.includes("shoe"), true);
    assert.equal(shoes.includes("shoes"), true);
  });

  it("keeps sql terms at least 3 characters", () => {
    for (const q of ["bag", "ring", "game", "phone", "shoes"]) {
      for (const t of sqlSearchTerms(q)) {
        assert.ok(t.length >= 3, `${q} produced short term ${t}`);
      }
    }
  });

  it("scores bag products above unrelated ba-substring noise", () => {
    const terms = expandSearchTerms("bag");
    const tote: SearchableProduct = {
      id: "1",
      name: "Canvas Tote Bag",
      slug: "canvas-tote-bag",
      short_description: "Everyday handbag",
    };
    const band: SearchableProduct = {
      id: "2",
      name: "Baseball Band Cap",
      slug: "baseball-band-cap",
      short_description: "Sport cap",
    };
    assert.ok(scoreProduct(tote, terms) > scoreProduct(band, terms));
    assert.ok(scoreProduct(tote, terms) >= 20);
  });

  it("does not soft-match spring coats for ring queries", () => {
    const terms = expandSearchTerms("ring");
    const jewelry: SearchableProduct = {
      id: "1",
      name: "Gold Engagement Ring",
      slug: "gold-ring",
    };
    const coat: SearchableProduct = {
      id: "2",
      name: "Spring Coat",
      slug: "spring-coat",
    };
    assert.ok(scoreProduct(jewelry, terms) > 50);
    assert.ok(scoreProduct(coat, terms) < 20);
  });

  it("resolves gaming categories for game without dumping fashion", () => {
    const categories: SearchableCategory[] = [
      { id: "g", name: "Gaming Accessories", slug: "gaming-accessories" },
      { id: "f", name: "Fashion", slug: "fashion" },
      { id: "h", name: "Home & Living", slug: "home-living" },
      { id: "e", name: "Electronics", slug: "electronics" },
    ];
    const ids = resolveMatchedCategoryIds(categories, "game");
    assert.equal(ids.includes("g"), true);
    assert.equal(ids.includes("f"), false);
    assert.equal(ids.includes("h"), false);
  });

  it("resolves electronics for phone queries", () => {
    const categories: SearchableCategory[] = [
      { id: "e", name: "Electronics", slug: "electronics" },
      { id: "f", name: "Fashion", slug: "fashion" },
    ];
    const ids = resolveMatchedCategoryIds(categories, "phone");
    assert.equal(ids.includes("e"), true);
  });

  it("resolves fashion for bag / shoes / ring", () => {
    const categories: SearchableCategory[] = [
      { id: "f", name: "Fashion", slug: "fashion" },
      { id: "g", name: "Gaming Accessories", slug: "gaming-accessories" },
    ];
    for (const q of ["bag", "shoes", "ring"]) {
      const ids = resolveMatchedCategoryIds(categories, q);
      assert.equal(ids.includes("f"), true, `${q} should match fashion`);
      assert.equal(ids.includes("g"), false, `${q} should not match gaming`);
    }
  });
});
