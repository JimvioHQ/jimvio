import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  normalizeStorefrontHref,
  storefrontBrowsePath,
  storefrontDisplayUrl,
  storefrontHref,
} from "./storefront-url.ts";

describe("storefront urls", () => {
  it("builds path browse urls", () => {
    assert.equal(storefrontBrowsePath("Brand", "/cart"), "/s/brand/cart");
    assert.equal(storefrontBrowsePath("brand"), "/s/brand");
  });

  it("builds host-mode hrefs without /s prefix", () => {
    assert.equal(storefrontHref("brand", "/cart", { onStoreHost: true }), "/cart");
    assert.equal(storefrontHref("brand", "", { onStoreHost: true }), "/");
    assert.equal(storefrontHref("brand", "/cart"), "/s/brand/cart");
  });

  it("normalizes stored nav hrefs on store hosts", () => {
    assert.equal(
      normalizeStorefrontHref("brand", "/s/brand/cart", { onStoreHost: true }),
      "/cart"
    );
    assert.equal(
      normalizeStorefrontHref("brand", "/s/brand", { onStoreHost: true }),
      "/"
    );
    assert.equal(
      normalizeStorefrontHref("brand", "/s/brand/cart", { onStoreHost: false }),
      "/s/brand/cart"
    );
    assert.equal(
      normalizeStorefrontHref("brand", "/pages/about"),
      "/s/brand/pages/about"
    );
    assert.equal(
      normalizeStorefrontHref("brand", "/collections/all?sort=sale"),
      "/s/brand/collections/all?sort=sale"
    );
    assert.equal(
      normalizeStorefrontHref("brand", "/pages/about", { onStoreHost: true }),
      "/pages/about"
    );
  });

  it("uses subdomain canonical display urls", () => {
    assert.equal(
      storefrontDisplayUrl("p7-provider-store"),
      "https://p7-provider-store.jimvio.com"
    );
  });
});
