import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createShopifyOAuthState,
  decryptShopifySecret,
  encryptShopifySecret,
  parseAndVerifyShopifyOAuthState,
  SHOPIFY_SECRET_PREFIX,
  safeEqualString,
} from "./credential-crypto.ts";
import { assertValidShopifyShopDomain } from "./shopify-domain.ts";
import { verifyShopifyWebhookHmac } from "../webhooks/verify.ts";
import { createHmac } from "node:crypto";

describe("shopify shop domain validation", () => {
  it("accepts myshopify.com domains", () => {
    const r = assertValidShopifyShopDomain("https://My-Store.myshopify.com/admin");
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.domain, "my-store.myshopify.com");
  });

  it("rejects arbitrary domains", () => {
    const r = assertValidShopifyShopDomain("evil.com");
    assert.equal(r.ok, false);
  });

  it("rejects javascript URLs", () => {
    const r = assertValidShopifyShopDomain("javascript:alert(1)");
    assert.equal(r.ok, false);
  });

  it("rejects CRLF injection", () => {
    const r = assertValidShopifyShopDomain("store.myshopify.com\r\nHost: evil");
    assert.equal(r.ok, false);
  });
});

describe("shopify credential crypto", () => {
  it("round-trips encryption", () => {
    process.env.SHOPIFY_ENCRYPTION_KEY = "test-shopify-encryption-key-for-unit-tests";
    const token = "shpat_test_token_value_12345";
    const enc = encryptShopifySecret(token);
    assert.ok(enc.startsWith(SHOPIFY_SECRET_PREFIX));
    assert.equal(decryptShopifySecret(enc), token);
  });

  it("reads legacy plaintext tokens", () => {
    assert.equal(decryptShopifySecret("shpat_legacy"), "shpat_legacy");
  });

  it("does not embed plaintext in ciphertext", () => {
    process.env.SHOPIFY_ENCRYPTION_KEY = "test-shopify-encryption-key-for-unit-tests";
    const token = "shpat_secret_should_not_appear";
    const enc = encryptShopifySecret(token);
    assert.equal(enc.includes(token), false);
  });
});

describe("shopify oauth state", () => {
  it("creates and verifies state", () => {
    process.env.SHOPIFY_CLIENT_SECRET = "shopify-client-secret-for-tests";
    const state = createShopifyOAuthState({
      vendorId: "11111111-1111-1111-1111-111111111111",
      userId: "22222222-2222-2222-2222-222222222222",
      shop: "demo.myshopify.com",
      ttlSeconds: 60,
    });
    const verified = parseAndVerifyShopifyOAuthState(state);
    assert.equal(verified.ok, true);
    if (verified.ok) {
      assert.equal(verified.payload.shop, "demo.myshopify.com");
      assert.ok(verified.payload.nonce.length > 8);
    }
  });

  it("rejects tampered state", () => {
    process.env.SHOPIFY_CLIENT_SECRET = "shopify-client-secret-for-tests";
    const state = createShopifyOAuthState({
      vendorId: "11111111-1111-1111-1111-111111111111",
      userId: "22222222-2222-2222-2222-222222222222",
      shop: "demo.myshopify.com",
    });
    const tampered = state.slice(0, -4) + "xxxx";
    const verified = parseAndVerifyShopifyOAuthState(tampered);
    assert.equal(verified.ok, false);
  });

  it("rejects expired state", () => {
    process.env.SHOPIFY_CLIENT_SECRET = "shopify-client-secret-for-tests";
    const state = createShopifyOAuthState({
      vendorId: "11111111-1111-1111-1111-111111111111",
      userId: "22222222-2222-2222-2222-222222222222",
      shop: "demo.myshopify.com",
      ttlSeconds: -10,
    });
    const verified = parseAndVerifyShopifyOAuthState(state);
    assert.equal(verified.ok, false);
  });

  it("safeEqualString rejects different lengths", () => {
    assert.equal(safeEqualString("abc", "ab"), false);
    assert.equal(safeEqualString("abc", "abc"), true);
  });
});

describe("shopify webhook hmac", () => {
  it("accepts valid hmac", () => {
    const secret = "whsec_test";
    const body = '{"id":1}';
    const hmac = createHmac("sha256", secret).update(body, "utf8").digest("base64");
    assert.equal(verifyShopifyWebhookHmac(body, hmac, secret), true);
  });

  it("rejects invalid hmac", () => {
    assert.equal(
      verifyShopifyWebhookHmac('{"id":1}', "not-valid-base64-hmac==", "whsec_test"),
      false
    );
  });

  it("rejects missing secret", () => {
    assert.equal(verifyShopifyWebhookHmac("{}", "abc", ""), false);
  });
});

describe("shopify oauth scopes", () => {
  it("includes merchant-managed FO scopes and locations; excludes unused assigned FO", async () => {
    const { SHOPIFY_DEFAULT_OAUTH_SCOPES, getShopifyOAuthScopes } = await import(
      "./shopify-scopes.ts"
    );
    assert.ok(
      SHOPIFY_DEFAULT_OAUTH_SCOPES.includes(
        "write_merchant_managed_fulfillment_orders"
      )
    );
    assert.ok(SHOPIFY_DEFAULT_OAUTH_SCOPES.includes("read_locations"));
    assert.ok(!SHOPIFY_DEFAULT_OAUTH_SCOPES.includes("read_assigned_fulfillment_orders"));
    assert.ok(!SHOPIFY_DEFAULT_OAUTH_SCOPES.includes("read_shipping"));
    const csv = getShopifyOAuthScopes();
    assert.match(csv, /write_merchant_managed_fulfillment_orders/);
    assert.match(csv, /read_locations/);
  });
});

describe("shopify compliance topic helpers", () => {
  it("recognizes mandatory compliance topics", async () => {
    const { isShopifyComplianceTopic } = await import("./shopify-compliance-topics.ts");
    assert.equal(isShopifyComplianceTopic("customers/data_request"), true);
    assert.equal(isShopifyComplianceTopic("customers/redact"), true);
    assert.equal(isShopifyComplianceTopic("shop/redact"), true);
    assert.equal(isShopifyComplianceTopic("orders/create"), false);
  });
});
