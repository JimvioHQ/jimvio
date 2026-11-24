/**
 * Dropshipping OS end-to-end scenario (mocked suppliers/stores — no live orders).
 * Run: npx tsx --test lib/dropshipping/e2e-scenario.test.ts
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateSellingPrice, availableInventory } from "./pricing/engine";
import { ShopifyStoreConnector } from "./stores/shopify-connector";
import { normalizeTrackingStatus } from "./fulfillment/router";
import { hashApiKey, generateApiKey } from "./api/idempotency";

describe("Dropshipping OS E2E scenario (fixtures)", () => {
  it("1-5 import pricing + mapping identities stay distinct", () => {
    const jimvioProductId = "11111111-1111-1111-1111-111111111111";
    const jimvioVariantId = "22222222-2222-2222-2222-222222222222";
    const supplierVariantId = "CJVID_REAL_1";
    const storeProductId = "gid://shopify/Product/1";
    const storeVariantId = "gid://shopify/ProductVariant/2";

    const priced = calculateSellingPrice({
      supplierCost: 10,
      markupType: "percent",
      markupValue: 40,
    });
    assert.equal(priced.ok, true);
    if (!priced.ok) return;

    const mapping = {
      jimvioProductId,
      jimvioVariantId,
      supplierVariantId,
      storeProductId,
      storeVariantId,
      sellingPrice: priced.sellingPrice,
    };

    assert.notEqual(mapping.jimvioVariantId, mapping.supplierVariantId);
    assert.notEqual(mapping.storeVariantId, mapping.supplierVariantId);
    assert.equal(mapping.sellingPrice, 14);
  });

  it("6-9 inventory + price sync math with safety stock", () => {
    const supplierStock = 7;
    const safety = 2;
    assert.equal(availableInventory(supplierStock, safety), 5);

    const priceUpdate = calculateSellingPrice({
      supplierCost: 12,
      markupType: "percent",
      markupValue: 40,
      maxPrice: 20,
    });
    assert.equal(priceUpdate.ok, true);
    if (priceUpdate.ok) assert.equal(priceUpdate.sellingPrice, 16.8);
  });

  it("10-12 order normalize + idempotency key uniqueness", () => {
    const connector = new ShopifyStoreConnector({
      shopDomain: "demo.myshopify.com",
      accessToken: "x",
      apiVersion: "2024-10",
    });
    const a = connector.normalizeOrder({
      id: 5001,
      currency: "USD",
      subtotal_price: "14.00",
      total_tax: "0",
      total_discounts: "0",
      total_price: "14.00",
      line_items: [
        { product_id: 1, variant_id: 2, quantity: 1, price: "14.00", sku: "SKU" },
      ],
    });
    const b = connector.normalizeOrder({
      id: 5001,
      currency: "USD",
      subtotal_price: "14.00",
      total_tax: "0",
      total_discounts: "0",
      total_price: "14.00",
      line_items: [
        { product_id: 1, variant_id: 2, quantity: 1, price: "14.00", sku: "SKU" },
      ],
    });
    assert.equal(a.externalOrderId, b.externalOrderId);
  assert.equal(a.paymentStatus, "paid");
    const idemA = `shopify:${a.externalOrderId}`;
    const idemB = `shopify:${b.externalOrderId}`;
    assert.equal(idemA, idemB);
  });

  it("13-18 fulfillment + tracking status normalization", () => {
    assert.equal(normalizeTrackingStatus("submitted"), "submitted");
    assert.equal(normalizeTrackingStatus("shipped"), "shipped");
    assert.equal(normalizeTrackingStatus("in_transit"), "in_transit");
    assert.equal(normalizeTrackingStatus("delivered"), "delivered");
  });

  it("API key secret is hashed and shown only via raw once", () => {
    const key = generateApiKey();
    assert.ok(key.raw.startsWith("jmv_"));
    assert.equal(hashApiKey(key.raw), key.hash);
    assert.notEqual(key.hash, key.raw);
  });
});
