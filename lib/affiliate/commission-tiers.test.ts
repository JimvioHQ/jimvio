import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  affiliateCommissionCapPercent,
  capAffiliateRate,
  resolveAffiliateOffer,
} from "./commission-tiers.ts";

describe("affiliate commission price caps", () => {
  it("uses the exact price boundaries", () => {
    assert.equal(affiliateCommissionCapPercent(0.01), 18);
    assert.equal(affiliateCommissionCapPercent(5), 18);
    assert.equal(affiliateCommissionCapPercent(5.01), 16.5);
    assert.equal(affiliateCommissionCapPercent(15), 16.5);
    assert.equal(affiliateCommissionCapPercent(15.01), 14.2);
    assert.equal(affiliateCommissionCapPercent(30), 14.2);
    assert.equal(affiliateCommissionCapPercent(30.01), 13.4);
    assert.equal(affiliateCommissionCapPercent(60), 13.4);
    assert.equal(affiliateCommissionCapPercent(60.01), 12.1);
    assert.equal(affiliateCommissionCapPercent(120), 12.1);
  });

  it("does not assign a tier for missing, zero, negative, or invalid prices", () => {
    assert.equal(affiliateCommissionCapPercent(0), null);
    assert.equal(affiliateCommissionCapPercent(-1), null);
    assert.equal(affiliateCommissionCapPercent(Number.NaN), null);
    assert.equal(affiliateCommissionCapPercent(Number.POSITIVE_INFINITY), null);
    assert.equal(capAffiliateRate(0, 20), null);
  });

  it("keeps a valid rate and clamps anything above the tier", () => {
    assert.equal(capAffiliateRate(4, 10), 10);
    assert.equal(capAffiliateRate(4, 20), 18);
    assert.equal(capAffiliateRate(5.01, 20), 16.5);
    assert.equal(capAffiliateRate(20, 20), 14.2);
    assert.equal(capAffiliateRate(42, 20), 13.4);
    assert.equal(capAffiliateRate(80, 20), 12.1);
  });

  it("makes the displayed earning match the capped rate", () => {
    const offer = resolveAffiliateOffer({
      priceUsd: 5.12,
      configuredPercent: 20,
      fallbackPercent: 5,
    });
    assert.equal(offer.rate, 16.5);
    assert.equal(offer.earningUsd, 0.84);
  });

  it("keeps a lower fixed earning and does not rewrite a paid snapshot", () => {
    const paid = { status: "paid", amount: 9.5, rate: 20 };
    const offer = resolveAffiliateOffer({
      priceUsd: 40,
      configuredPercent: 20,
      fixedEarningUsd: 2,
    });
    assert.equal(offer.earningUsd, 2);
    assert.equal(offer.rate, 5);
    assert.deepEqual(paid, { status: "paid", amount: 9.5, rate: 20 });
  });

  it("caps a fixed earning that would exceed the tier", () => {
    const offer = resolveAffiliateOffer({
      priceUsd: 10,
      configuredPercent: 20,
      fixedEarningUsd: 5,
    });
    assert.equal(offer.earningUsd, 1.65);
    assert.equal(offer.rate, 16.5);
  });
});
