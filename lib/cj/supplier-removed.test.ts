import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { isPermanentUnpublishReason } from "./import-intelligence/progressive-publish";
import {
  CJ_SUPPLIER_REMOVED_REASON,
  isCjRemovedFromShelvesMessage,
  isStorefrontPurchasable,
  isTransientCjStockFailure,
} from "./supplier-removed";

describe("supplier removed from shelves", () => {
  it("recognizes the supplier removal message and does not treat it as a retryable network error", () => {
    const message = "Product has been removed from shelves, pid:1389417699574157312";
    assert.equal(isCjRemovedFromShelvesMessage(message), true);
    assert.equal(isTransientCjStockFailure(message), false);
    assert.equal(isTransientCjStockFailure("The operation was aborted due to timeout"), true);
    assert.equal(isCjRemovedFromShelvesMessage("fetch failed"), false);
  });

  it("uses the existing permanent unpublish reason so restore will not republish it", () => {
    assert.equal(isPermanentUnpublishReason(CJ_SUPPLIER_REMOVED_REASON), true);
  });

  it("keeps a draft or inactive listing out of new purchases", () => {
    assert.equal(isStorefrontPurchasable({ status: "active", is_active: true, deleted_at: null }), true);
    assert.equal(isStorefrontPurchasable({ status: "draft", is_active: false, deleted_at: null }), false);
    assert.equal(isStorefrontPurchasable({ status: "active", is_active: false, deleted_at: null }), false);
  });

  it("cart, checkout, and the product page already reject an inactive listing", () => {
    const checkout = readFileSync(new URL("../actions/checkout.ts", import.meta.url), "utf8");
    const marketplace = readFileSync(new URL("../actions/marketplace.ts", import.meta.url), "utf8");
    const productPage = readFileSync(new URL("../../services/products.ts", import.meta.url), "utf8");
    const submit = readFileSync(new URL("../sources/cj/submit-order.ts", import.meta.url), "utf8");
    assert.match(checkout, /status !== "active" \|\| !p\.is_active/);
    assert.match(marketplace, /status !== "active" \|\| !product\.is_active/);
    assert.match(productPage, /\.eq\("status", "active"\)/);
    assert.match(productPage, /\.eq\("is_active", true\)/);
    assert.match(submit, /stockCheck\.errors\.length > 0/);
    assert.match(submit, /createOrderV2/);
    const submitBeforeOrder = submit.slice(0, submit.indexOf("createOrderV2"));
    assert.match(submitBeforeOrder, /stockCheck\.errors\.length > 0/);
  });
});
