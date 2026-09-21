import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  merchantAuthAbsoluteUrl,
  resolveMerchantAuthRedirect,
} from "./merchant-auth-redirect.ts";

describe("resolveMerchantAuthRedirect", () => {
  it("allows merchant storefront destinations", () => {
    for (const path of [
      "/cart",
      "/checkout",
      "/account",
      "/account/orders",
      "/account/orders/ord_123",
      "/products",
      "/collections/all",
      "/about",
      "/contact",
      "/shipping",
      "/refund-policy",
      "/privacy",
      "/terms",
    ]) {
      assert.equal(resolveMerchantAuthRedirect(path), path);
    }
  });

  it("falls back to / for missing or empty next", () => {
    assert.equal(resolveMerchantAuthRedirect(null), "/");
    assert.equal(resolveMerchantAuthRedirect(undefined), "/");
    assert.equal(resolveMerchantAuthRedirect(""), "/");
    assert.equal(resolveMerchantAuthRedirect("   "), "/");
  });

  it("rejects platform destinations", () => {
    for (const path of [
      "/communities",
      "/marketplace",
      "/commerce",
      "/affiliates",
      "/ugc",
      "/dashboard",
      "/seller",
      "/creator",
    ]) {
      assert.equal(resolveMerchantAuthRedirect(path), "/");
    }
  });

  it("rejects open redirects", () => {
    for (const path of [
      "https://evil.example",
      "https://www.jimvio.com/communities",
      "//evil.example",
      "javascript:alert(1)",
      "data:text/html,hi",
    ]) {
      assert.equal(resolveMerchantAuthRedirect(path), "/");
    }
  });

  it("builds absolute URLs on the trusted origin only", () => {
    assert.equal(
      merchantAuthAbsoluteUrl("https://p7-provider-store.jimvio.com", "/cart"),
      "https://p7-provider-store.jimvio.com/cart",
    );
    assert.equal(
      merchantAuthAbsoluteUrl(
        "https://p7-provider-store.jimvio.com",
        "/communities",
      ),
      "https://p7-provider-store.jimvio.com/",
    );
  });
});
