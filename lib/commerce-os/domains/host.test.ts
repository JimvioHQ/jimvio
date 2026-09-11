import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  handleFromJimvioSubdomain,
  isMerchantStorefrontPath,
  isMerchantStorefrontRequest,
  isPlatformHostname,
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
    assert.equal(
      shouldAttemptStoreHostRewrite("brand.jimvio.com", "/collections/all"),
      true
    );
    assert.equal(
      shouldAttemptStoreHostRewrite("brand.jimvio.com", "/product/sku"),
      true
    );
  });

  it("does not rewrite platform paths on custom hosts", () => {
    assert.equal(shouldAttemptStoreHostRewrite("brand.com", "/api/health"), false);
    assert.equal(shouldAttemptStoreHostRewrite("brand.com", "/admin"), false);
    assert.equal(shouldAttemptStoreHostRewrite("brand.jimvio.com", "/checkout"), false);
    assert.equal(shouldAttemptStoreHostRewrite("brand.jimvio.com", "/marketplace"), false);
    assert.equal(shouldAttemptStoreHostRewrite("brand.jimvio.com", "/commerce"), false);
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
      isMerchantStorefrontRequest("www.jimvio.com", "/", "brand"),
      true
    );
  });
});
