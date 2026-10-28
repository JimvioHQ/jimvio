import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { marketplaceCustomerUsd } from "./display-price.ts";

describe("marketplace customer USD", () => {
  it("uses the stored price_usd and does not relabel RWF", () => {
    assert.equal(
      marketplaceCustomerUsd({ price: 8320, price_usd: 5.63, currency: "RWF" }),
      5.63,
    );
    assert.notEqual(
      marketplaceCustomerUsd({ price: 8320, price_usd: 5.63, currency: "RWF" }),
      Math.round(8320 * 0.0008 * 100) / 100,
    );
    assert.equal(marketplaceCustomerUsd({ price: 8320, currency: "RWF" }), null);
    assert.equal(marketplaceCustomerUsd({ price: 19.5, currency: "USD" }), 19.5);
  });

  it("scales a variant with the listing's own price pair", () => {
    const scaled = marketplaceCustomerUsd({
      price: 8320,
      price_usd: 5.63,
      currency: "RWF",
      variantPrice: 9000,
    });
    assert.equal(scaled, Math.round(9000 * (5.63 / 8320) * 100) / 100);
    assert.equal(
      marketplaceCustomerUsd({ price: 8320, currency: "RWF", variantPrice: 9000 }),
      null,
    );
  });
});
