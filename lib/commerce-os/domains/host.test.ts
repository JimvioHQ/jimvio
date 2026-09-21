import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  handleFromJimvioSubdomain,
  isMerchantHostBlockedPlatformPath,
  isMerchantStorefrontPath,
  isMerchantStorefrontRequest,
  isPlatformHostname,
  resolveStoreHostPath,
  shouldAttemptStoreHostRewrite,
} from "./host.ts";

describe("commerce host routing", () => {
  it("extracts store handle from jimvio subdomain", () => {
    assert.equal(handleFromJimvioSubdomain("brand.jimvio.com"), "brand");
    assert.equal(handleFromJimvioSubdomain("my-shop.jimvio.com"), "my-shop");
    assert.equal(handleFromJimvioSubdomain("www.jimvio.com"), null);
    assert.equal(handleFromJimvioSubdomain("api.jimvio.com"), null);
    assert.equal(handleFromJimvioSubdomain("Brand.Jimvio.com."), "brand");
  });

  it("recognizes platform hosts", () => {
    assert.equal(isPlatformHostname("www.jimvio.com"), true);
    assert.equal(isPlatformHostname("jimvio.com"), true);
    assert.equal(isPlatformHostname("brand.jimvio.com"), false);
    assert.equal(isPlatformHostname("preview-abc.vercel.app"), true);
  });

  it("rewrites storefront surfaces on merchant hosts", () => {
    assert.equal(shouldAttemptStoreHostRewrite("brand.jimvio.com", "/"), true);
    assert.equal(shouldAttemptStoreHostRewrite("brand.jimvio.com", "/cart"), true);
    assert.equal(shouldAttemptStoreHostRewrite("brand.jimvio.com", "/checkout"), true);
    assert.equal(shouldAttemptStoreHostRewrite("brand.jimvio.com", "/login"), true);
    assert.equal(shouldAttemptStoreHostRewrite("brand.jimvio.com", "/register"), true);
    assert.equal(shouldAttemptStoreHostRewrite("brand.jimvio.com", "/account"), true);
    assert.equal(shouldAttemptStoreHostRewrite("brand.jimvio.com", "/orders"), true);
    assert.equal(
      shouldAttemptStoreHostRewrite("brand.jimvio.com", "/collections/all"),
      true
    );
    assert.equal(
      shouldAttemptStoreHostRewrite("brand.jimvio.com", "/product/sku"),
      true
    );
    assert.equal(shouldAttemptStoreHostRewrite("brand.jimvio.com", "/terms"), true);
  });

  it("maps friendly legal paths on merchant hosts", () => {
    assert.equal(resolveStoreHostPath("/terms"), "/pages/terms");
    assert.equal(resolveStoreHostPath("/privacy"), "/pages/privacy");
    assert.equal(resolveStoreHostPath("/refund-policy"), "/pages/refund-policy");
    assert.equal(resolveStoreHostPath("/shipping-policy"), "/pages/shipping-policy");
    assert.equal(resolveStoreHostPath("/products"), "/collections/all");
    assert.equal(resolveStoreHostPath("/products/hat"), "/product/hat");
    assert.equal(resolveStoreHostPath("/cart"), "/cart");
    assert.equal(resolveStoreHostPath("/orders"), "/account/orders");
    assert.equal(resolveStoreHostPath("/signup"), "/register");
    assert.equal(resolveStoreHostPath("/sign-up"), "/register");
  });

  it("does not rewrite platform paths on custom hosts", () => {
    assert.equal(shouldAttemptStoreHostRewrite("brand.com", "/api/health"), false);
    assert.equal(shouldAttemptStoreHostRewrite("brand.com", "/admin"), false);
    assert.equal(shouldAttemptStoreHostRewrite("brand.jimvio.com", "/marketplace"), false);
    assert.equal(shouldAttemptStoreHostRewrite("brand.jimvio.com", "/commerce"), false);
    assert.equal(shouldAttemptStoreHostRewrite("brand.jimvio.com", "/settings"), false);
    assert.equal(shouldAttemptStoreHostRewrite("www.jimvio.com", "/"), false);
  });

  it("detects merchant storefront shell contexts", () => {
    assert.equal(isMerchantStorefrontPath("/s/brand"), true);
    assert.equal(isMerchantStorefrontPath("/marketplace"), false);
    assert.equal(
      isMerchantStorefrontRequest("brand.jimvio.com", "/"),
      true
    );
    assert.equal(
      isMerchantStorefrontRequest("www.jimvio.com", "/s/brand"),
      true
    );
    assert.equal(
      isMerchantStorefrontRequest("www.jimvio.com", "/marketplace"),
      false
    );
    assert.equal(
      isMerchantStorefrontRequest("www.jimvio.com", "/", null, "1"),
      true
    );
  });

  it("treats unknown jimvio subdomains as merchant hosts so missing stores 404", () => {
    assert.equal(handleFromJimvioSubdomain("no-such-store.jimvio.com"), "no-such-store");
    assert.equal(isPlatformHostname("no-such-store.jimvio.com"), false);
    assert.equal(isMerchantStorefrontRequest("no-such-store.jimvio.com", "/"), true);
  });

  it("blocks Jimvio platform paths on merchant hosts", () => {
    assert.equal(isMerchantHostBlockedPlatformPath("/communities"), true);
    assert.equal(isMerchantHostBlockedPlatformPath("/marketplace"), true);
    assert.equal(isMerchantHostBlockedPlatformPath("/affiliates/x"), true);
    assert.equal(isMerchantHostBlockedPlatformPath("/ugc"), true);
    assert.equal(isMerchantHostBlockedPlatformPath("/commerce/orders"), true);
    assert.equal(isMerchantHostBlockedPlatformPath("/cart"), false);
    assert.equal(isMerchantHostBlockedPlatformPath("/product/x"), false);
    assert.equal(isMerchantHostBlockedPlatformPath("/login"), false);
  });
});
