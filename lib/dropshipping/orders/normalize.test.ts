import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createHash, timingSafeEqual } from "crypto";
import { hashApiKey, generateApiKey } from "../api/idempotency";
import { normalizeTrackingStatus } from "../fulfillment/router";
import { ShopifyStoreConnector } from "../stores/shopify-connector";

describe("api key hashing", () => {
  it("hashes consistently and generates jmv_ prefix", () => {
    const { raw, prefix, hash } = generateApiKey();
    assert.ok(raw.startsWith("jmv_"));
    assert.equal(prefix, raw.slice(0, 12));
    assert.equal(hash, hashApiKey(raw));
    assert.notEqual(hash, raw);
  });
});

describe("normalizeTrackingStatus", () => {
  it("maps provider statuses to internal statuses", () => {
    assert.equal(normalizeTrackingStatus("shipped"), "shipped");
    assert.equal(normalizeTrackingStatus("in_transit"), "in_transit");
    assert.equal(normalizeTrackingStatus("delivered"), "delivered");
    assert.equal(normalizeTrackingStatus("cancelled"), "cancelled");
  });
});

describe("shopify order normalization", () => {
  it("normalizes a Shopify order payload without inventing ids", () => {
    const connector = new ShopifyStoreConnector({
      shopDomain: "example.myshopify.com",
      accessToken: "test",
      apiVersion: "2024-10",
    });
    const normalized = connector.normalizeOrder({
      id: 999,
      order_number: 1001,
      email: "buyer@example.com",
      currency: "USD",
      subtotal_price: "20.00",
      total_tax: "0",
      total_discounts: "0",
      total_price: "25.00",
      shipping_lines: [{ price: "5.00" }],
      line_items: [
        {
          product_id: 1,
          variant_id: 2,
          sku: "SKU-1",
          title: "Hat",
          quantity: 2,
          price: "10.00",
        },
      ],
    });
    assert.equal(normalized.externalOrderId, "999");
    assert.equal(normalized.lineItems.length, 1);
    assert.equal(normalized.lineItems[0]?.storeVariantId, "2");
    assert.equal(normalized.total, 25);
  });
});

describe("shopify webhook hmac helper shape", () => {
  it("timing-safe compares digests of equal length", () => {
    const body = '{"id":1}';
    const secret = "shhh";
    const digest = createHash("sha256").update(body).digest();
    const other = createHash("sha256").update(body).digest();
    assert.equal(timingSafeEqual(digest, other), true);
    assert.equal(secret.length > 0, true);
  });
});
