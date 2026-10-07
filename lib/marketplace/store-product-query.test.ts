import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { join } from "node:path";
import {
  buildStoreProductsHref,
  filterStoreProductsInMemory,
  parseStoreProductSort,
  parseStoreSearchQuery,
  sortStoreProductsInMemory,
} from "./store-product-query";

const root = process.cwd();

const catalog = [
  {
    id: "1",
    vendor_id: "store-a",
    name: "Fashion Boots",
    sku: "BOOT-40",
    short_description: "Leather boots",
    price: 21,
    created_at: "2026-01-03T00:00:00Z",
    sale_count: 2,
  },
  {
    id: "2",
    vendor_id: "store-a",
    name: "Cotton Shirt",
    sku: "SHIRT-1",
    short_description: "Casual shirt",
    price: 10,
    created_at: "2026-01-02T00:00:00Z",
    sale_count: 8,
  },
  {
    id: "3",
    vendor_id: "store-a",
    name: "Phone Case",
    sku: "PHONE-9",
    short_description: "Magnetic case",
    price: 3,
    created_at: "2026-01-01T00:00:00Z",
    sale_count: 20,
  },
  {
    id: "4",
    vendor_id: "store-b",
    name: "Boots Pro",
    sku: "BOOT-B",
    short_description: "Other store boots",
    price: 5,
    created_at: "2026-01-04T00:00:00Z",
    sale_count: 100,
  },
];

describe("store product search + sort", () => {
  it("filters by title within one store only", () => {
    const hits = filterStoreProductsInMemory(catalog, "store-a", "boots");
    assert.equal(hits.length, 1);
    assert.equal(hits[0].name, "Fashion Boots");
    assert.equal(
      hits.every((p) => p.vendor_id === "store-a"),
      true,
    );
  });

  it("never returns another store's products", () => {
    const hits = filterStoreProductsInMemory(catalog, "store-a", "boots");
    assert.equal(
      hits.some((p) => p.vendor_id === "store-b"),
      false,
    );
    assert.equal(
      filterStoreProductsInMemory(catalog, "store-a", "Boots Pro").length,
      0,
    );
  });

  it("sorts price low to high using numeric price", () => {
    const sorted = sortStoreProductsInMemory(
      catalog.filter((p) => p.vendor_id === "store-a"),
      "price_asc",
    ).map((p) => p.price);
    assert.deepEqual(sorted, [3, 10, 21]);
  });

  it("sorts price high to low using numeric price", () => {
    const sorted = sortStoreProductsInMemory(
      catalog.filter((p) => p.vendor_id === "store-a"),
      "price_desc",
    ).map((p) => p.price);
    assert.deepEqual(sorted, [21, 10, 3]);
  });

  it("combines search + price ascending", () => {
    const mixed = [
      ...catalog,
      {
        id: "5",
        vendor_id: "store-a",
        name: "Trail Boots",
        sku: "BOOT-T",
        short_description: null,
        price: 14,
        created_at: "2026-01-05T00:00:00Z",
        sale_count: 1,
      },
    ];
    const hits = filterStoreProductsInMemory(mixed, "store-a", "boots");
    const sorted = sortStoreProductsInMemory(hits, "price_asc");
    assert.deepEqual(
      sorted.map((p) => p.name),
      ["Trail Boots", "Fashion Boots"],
    );
    assert.deepEqual(
      sorted.map((p) => p.price),
      [14, 21],
    );
  });

  it("parses URL query/sort state", () => {
    assert.equal(parseStoreSearchQuery("boots"), "boots");
    assert.equal(parseStoreProductSort("price_asc"), "price_asc");
    assert.equal(
      buildStoreProductsHref({
        slug: "jimvio-store",
        q: "boots",
        sort: "price_asc",
      }),
      "/vendors/jimvio-store?q=boots&sort=price_asc",
    );
  });

  it("empty search yields no fabricated matches", () => {
    const hits = filterStoreProductsInMemory(catalog, "store-a", "zzzz-no-match");
    assert.equal(hits.length, 0);
  });

  it("store page uses server-scoped query + URL controls", () => {
    const page = readFileSync(
      join(root, "app/(public)/vendors/[slug]/page.tsx"),
      "utf8",
    );
    const service = readFileSync(join(root, "services/products.ts"), "utf8");
    assert.equal(page.includes("queryVendorStoreProducts"), true);
    assert.equal(page.includes("StoreProductControls"), true);
    assert.equal(page.includes("No products found"), true);
    assert.equal(page.includes("searchParams"), true);
    assert.equal(service.includes(".eq(\"vendor_id\", vendorId)"), true);
    assert.equal(service.includes("queryVendorStoreProducts"), true);
    assert.equal(service.includes("sale_count"), true);
  });
});
