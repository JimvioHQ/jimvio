import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  compareCatalogProducts,
  countProductFilters,
  isLowStock,
  isOutOfStock,
  matchesProductFilter,
  matchesProductSearch,
  productTypeLabel,
  showingProductsLabel,
  stockText,
  type CatalogProduct,
} from "./product-inventory";

function product(overrides: Partial<CatalogProduct> = {}): CatalogProduct {
  return {
    name: "Canvas tote",
    slug: "canvas-tote",
    price: 25,
    status: "active",
    product_type: "physical",
    is_digital: false,
    inventory_quantity: 12,
    sale_count: 3,
    view_count: 40,
    created_at: "2026-10-01T00:00:00.000Z",
    updated_at: "2026-10-20T00:00:00.000Z",
    track_inventory: true,
    low_stock_threshold: 5,
    ...overrides,
  };
}

describe("seller product inventory rules", () => {
  it("searches name and slug without inventing rows", () => {
    const rows = [product(), product({ name: "Guide", slug: "seller-guide", is_digital: true, product_type: "ebook" })];
    assert.deepEqual(rows.filter((row) => matchesProductSearch(row, "guide")).map((row) => row.slug), ["seller-guide"]);
    assert.deepEqual(rows.filter((row) => matchesProductSearch(row, "tote")).map((row) => row.slug), ["canvas-tote"]);
  });

  it("keeps review and stock filters on real product fields", () => {
    const digital = product({ name: "Preset", slug: "preset", is_digital: true, product_type: "template", inventory_quantity: 0, track_inventory: true });
    const low = product({ name: "Mug", slug: "mug", inventory_quantity: 2, status: "paused" });
    const empty = product({ name: "Hat", slug: "hat", inventory_quantity: 0, status: "pending_review" });
    const rejected = product({ name: "Lamp", slug: "lamp", status: "rejected", inventory_quantity: 8 });

    assert.equal(isOutOfStock(digital), false);
    assert.equal(isLowStock(digital), false);
    assert.equal(stockText(digital), "—");
    assert.equal(isLowStock(low), true);
    assert.equal(stockText(low), "Low · 2");
    assert.equal(isOutOfStock(empty), true);
    assert.equal(matchesProductFilter(empty, "In review"), true);
    assert.equal(matchesProductFilter(rejected, "Rejected"), true);
    assert.equal(matchesProductFilter(low, "Out of Stock"), false);
    assert.equal(productTypeLabel(digital), "Template");
    assert.equal(productTypeLabel(low), "Physical");

    const counts = countProductFilters([digital, low, empty, rejected]);
    assert.equal(counts.All, 4);
    assert.equal(counts["In review"], 1);
    assert.equal(counts.Rejected, 1);
    assert.equal(counts["Low Stock"], 1);
    assert.equal(counts["Out of Stock"], 1);
    assert.equal(counts.Digital, 1);
  });

  it("sorts by fields the page already loads and labels the real page window", () => {
    const older = product({ name: "Older", slug: "older", created_at: "2026-01-01T00:00:00.000Z", sale_count: 9, price: 10 });
    const newer = product({ name: "Newer", slug: "newer", created_at: "2026-10-02T00:00:00.000Z", sale_count: 1, price: 80 });
    const names = [older, newer].sort(compareCatalogProducts("newest")).map((row) => row.slug);
    assert.deepEqual(names, ["newer", "older"]);
    assert.equal([older, newer].sort(compareCatalogProducts("sales"))[0]?.slug, "older");
    assert.equal([older, newer].sort(compareCatalogProducts("price"))[0]?.slug, "newer");

    assert.equal(showingProductsLabel({
      productCount: 0,
      filteredCount: 0,
      page: 1,
      pageSize: 10,
      loadFailed: false,
    }), "Showing 0 of 0 products");

    assert.equal(showingProductsLabel({
      productCount: 25,
      filteredCount: 25,
      page: 2,
      pageSize: 10,
      loadFailed: false,
    }), "Showing 11–20 of 25 products");

    assert.equal(showingProductsLabel({
      productCount: 25,
      filteredCount: 0,
      page: 1,
      pageSize: 10,
      loadFailed: false,
    }), "Showing 0 of 25 products");

    assert.equal(showingProductsLabel({
      productCount: 0,
      filteredCount: 0,
      page: 1,
      pageSize: 10,
      loadFailed: true,
    }), "Products unavailable");
  });
});
