import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildStoreProductUpdate,
  marketplaceImportBlockReason,
  parseSellingPrice,
} from "./product-editor.ts";

describe("store product editor", () => {
  it("saves name, description, images, and selling price", () => {
    const result = buildStoreProductUpdate({
      name: "Winter Hat",
      description: "Warm wool hat",
      images: ["https://cdn.example/hat.jpg"],
      price: 24.5,
      variantCount: 1,
      currentPrice: 10,
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.patch.name, "Winter Hat");
    assert.equal(result.patch.description, "Warm wool hat");
    assert.deepEqual(result.patch.images, ["https://cdn.example/hat.jpg"]);
    assert.equal(result.patch.price, 24.5);
    assert.equal("sku" in result.patch, false);
    assert.equal("inventory_quantity" in result.patch, false);
    assert.equal("vendor_id" in result.patch, false);
  });

  it("rejects a non-positive or over-precise price", () => {
    assert.equal(parseSellingPrice(0).ok, false);
    assert.equal(parseSellingPrice(-1).ok, false);
    assert.equal(parseSellingPrice(1.999).ok, false);
    assert.equal(parseSellingPrice(12.5).ok, true);
  });

  it("does not replace variant prices with one global price", () => {
    const result = buildStoreProductUpdate({
      name: "Winter Hat",
      description: "Warm wool hat",
      images: [],
      price: 30,
      variantCount: 3,
      currentPrice: 24,
    });
    assert.equal(result.ok, false);
  });

  it("keeps the current price when a variant product is saved without a price change", () => {
    const result = buildStoreProductUpdate({
      name: "Winter Hat",
      description: "Warm wool hat",
      images: ["https://cdn.example/hat.jpg"],
      price: 24,
      variantCount: 3,
      currentPrice: 24,
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.patch.price, undefined);
  });
});

describe("marketplace import guard", () => {
  it("blocks another merchant, external sources, and duplicates", () => {
    assert.equal(
      marketplaceImportBlockReason({
        productVendorId: "other",
        merchantVendorId: "mine",
        source: "vendor",
        status: "active",
        alreadyLinked: false,
      })?.code,
      "PRODUCT_NOT_FOUND",
    );
    assert.equal(
      marketplaceImportBlockReason({
        productVendorId: "mine",
        merchantVendorId: "mine",
        source: "cj",
        status: "active",
        alreadyLinked: false,
      })?.code,
      "SOURCE_NOT_ALLOWED",
    );
    assert.equal(
      marketplaceImportBlockReason({
        productVendorId: "mine",
        merchantVendorId: "mine",
        source: "vendor",
        status: "active",
        alreadyLinked: true,
      })?.code,
      "ALREADY_IMPORTED",
    );
    assert.equal(
      marketplaceImportBlockReason({
        productVendorId: "mine",
        merchantVendorId: "mine",
        source: null,
        status: "active",
        alreadyLinked: false,
      }),
      null,
    );
  });
});
