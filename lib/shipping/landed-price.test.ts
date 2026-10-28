import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeLandedPrice } from "./landed-price.ts";

const opt = (o: Partial<Parameters<typeof computeLandedPrice>[1][number]>) => ({
  method_name: "Standard",
  shipping_fee: 5,
  currency: "USD",
  ...o,
});

describe("computeLandedPrice", () => {
  it("adds the recommended option's fee", () => {
    const r = computeLandedPrice(10, [opt({ shipping_fee: 9 }), opt({ shipping_fee: 4.5, is_recommended: true })]);
    assert.deepEqual(r, { totalUsd: 14.5, shippingUsd: 4.5, isFree: false });
  });
  it("treats free shipping as item price", () => {
    assert.deepEqual(computeLandedPrice(12, [], true), { totalUsd: 12, shippingUsd: 0, isFree: true });
  });
  it("never estimates without a known USD fee", () => {
    assert.equal(computeLandedPrice(10, []), null);
    assert.equal(computeLandedPrice(10, [opt({ currency: "EUR" })]), null);
    assert.equal(computeLandedPrice(null, [opt({})]), null);
  });
});
