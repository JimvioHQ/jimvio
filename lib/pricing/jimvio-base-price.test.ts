import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  pricesConflict,
  quoteJimvioBasePrice,
  usdToRwf,
} from "./jimvio-base-price";

describe("approved Jimvio CJ markup", () => {
  const cases: Array<[number, number, string]> = [
    [4, 5.6, "0.01-5.00"],
    [5, 7, "0.01-5.00"],
    [5.01, 6.51, "above-5.00-15.00"],
    [10, 13, "above-5.00-15.00"],
    [15, 19.5, "above-5.00-15.00"],
    [15.01, 18.76, "above-15.00-30.00"],
    [20, 25, "above-15.00-30.00"],
    [30, 37.5, "above-15.00-30.00"],
    [30.01, 36.01, "above-30.00-60.00"],
    [50, 60, "above-30.00-60.00"],
    [60, 72, "above-30.00-60.00"],
    [60.01, 69.01, "above-60.00"],
    [100, 115, "above-60.00"],
  ];

  for (const [cost, expected, tier] of cases) {
    it(`prices $${cost} at $${expected} (${tier})`, () => {
      const quote = quoteJimvioBasePrice(cost, "2026-10-13T00:00:00.000Z");
      assert.equal(quote.ok, true);
      if (!quote.ok) return;
      assert.equal(quote.jimvioBasePriceUsd, expected);
      assert.equal(quote.tierId, tier);
      assert.equal(quote.supplierCostUsd, cost);
      assert.equal(quote.shippingExcluded, true);
      assert.equal(quote.transactionFeesExcluded, true);
      assert.equal(
        quote.jimvioBasePriceUsd,
        Math.round((quote.supplierCostUsd + quote.markupAmountUsd) * 100) / 100,
      );
    });
  }

  it("does not price a zero or sub-cent cost", () => {
    assert.equal(quoteJimvioBasePrice(0).ok, false);
    assert.equal(quoteJimvioBasePrice(0.004).ok, false);
  });

  it("converts USD to RWF without adding another margin", () => {
    const quote = quoteJimvioBasePrice(4, "2026-10-13T00:00:00.000Z");
    assert.equal(quote.ok, true);
    if (!quote.ok) return;
    assert.equal(usdToRwf(quote.jimvioBasePriceUsd, 1350), 7560);
  });

  it("flags a locked listing whose stored base price misses the policy", () => {
    assert.equal(pricesConflict(5.6, 4), false);
    assert.equal(pricesConflict(9, 4), true);
  });
});
