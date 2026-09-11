import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DROPSHIPPING_TO_COMMERCE_REDIRECTS,
  mapDropshippingPathToCommerce,
} from "./legacy-redirects.ts";

describe("dropshipping → commerce redirects", () => {
  it("maps known legacy paths", () => {
    assert.equal(mapDropshippingPathToCommerce("/dropshipping"), "/commerce");
    assert.equal(
      mapDropshippingPathToCommerce("/dropshipping/integrations"),
      "/commerce/integrations"
    );
    assert.equal(
      mapDropshippingPathToCommerce("/dropshipping/stores"),
      "/commerce/connected-stores"
    );
    assert.equal(
      mapDropshippingPathToCommerce("/dropshipping/products"),
      "/commerce/channel-products"
    );
  });

  it("does not map APIs", () => {
    assert.equal(mapDropshippingPathToCommerce("/api/dropshipping/stores"), null);
  });

  it("covers every configured redirect key", () => {
    for (const [from, to] of Object.entries(DROPSHIPPING_TO_COMMERCE_REDIRECTS)) {
      assert.ok(from.startsWith("/dropshipping"));
      assert.ok(to.startsWith("/commerce"));
    }
  });
});
