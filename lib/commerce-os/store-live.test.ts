import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isJimvioStorePubliclyLive,
  jimvioStoreLiveLabel,
} from "./store-live.ts";
import { storefrontDisplayUrl } from "./storefront-url.ts";

describe("jimvio store live state", () => {
  it("treats only published stores as publicly live", () => {
    assert.equal(isJimvioStorePubliclyLive({ status: "published" }), true);
    assert.equal(isJimvioStorePubliclyLive({ status: "draft" }), false);
    assert.equal(isJimvioStorePubliclyLive({ status: "paused" }), false);
    assert.equal(isJimvioStorePubliclyLive({ status: null }), false);
    assert.equal(jimvioStoreLiveLabel({ status: "published" }), "Online");
    assert.equal(jimvioStoreLiveLabel({ status: "draft" }), "Offline");
  });

  it("uses canonical subdomain URLs for merchant CTAs", () => {
    assert.equal(
      storefrontDisplayUrl("My-Brand"),
      "https://my-brand.jimvio.com"
    );
    assert.ok(!storefrontDisplayUrl("my-brand").includes("www.jimvio.com/s/"));
  });
});
