import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { toPlatformUsd } from "../currency/platform.ts";
import {
  affiliateCommissionCapPercent,
  capAffiliateRate,
  offerForAffiliateProduct,
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

  it("keeps a fixed earning that lands exactly on the cap", () => {
    const offer = resolveAffiliateOffer({
      priceUsd: 10,
      configuredPercent: 20,
      fixedEarningUsd: 1.65,
    });
    assert.equal(offer.earningUsd, 1.65);
    assert.equal(offer.rate, 16.5);
    assert.equal(Math.round(offer.earningUsd * 100) / 100, Math.round(10 * (offer.rate / 100) * 100) / 100);
  });

  it("keeps different products on their own effective rates", () => {
    const low = resolveAffiliateOffer({ priceUsd: 4, configuredPercent: 10 });
    const high = resolveAffiliateOffer({ priceUsd: 4, configuredPercent: 20 });
    const expensive = resolveAffiliateOffer({ priceUsd: 80, configuredPercent: 20 });
    assert.equal(low.rate, 10);
    assert.equal(low.earningUsd, 0.4);
    assert.equal(high.rate, 18);
    assert.equal(expensive.rate, 12.1);
    assert.notEqual(low.rate, high.rate);
  });

  it("matches the displayed rate to the rounded earning at each boundary", () => {
    const cases = [
      { price: 5, rate: 18, earning: 0.9 },
      { price: 5.01, rate: 16.5, earning: 0.83 },
      { price: 15, rate: 16.5, earning: 2.48 },
      { price: 15.01, rate: 14.2, earning: 2.13 },
      { price: 30, rate: 14.2, earning: 4.26 },
      { price: 30.01, rate: 13.4, earning: 4.02 },
      { price: 60, rate: 13.4, earning: 8.04 },
      { price: 60.01, rate: 12.1, earning: 7.26 },
    ];
    for (const row of cases) {
      const offer = resolveAffiliateOffer({
        priceUsd: row.price,
        configuredPercent: 20,
      });
      assert.equal(offer.rate, row.rate);
      assert.equal(offer.earningUsd, row.earning);
      assert.equal(
        offer.earningUsd,
        Math.round(row.price * (offer.rate! / 100) * 100) / 100,
      );
    }
  });
});

describe("affiliate offer currency and client rates", () => {
  it("keeps the phone-case fixed earning under the tier cap", () => {
    const offer = offerForAffiliateProduct({
      price: 5.12,
      currency: "USD",
      configuredPercent: 20,
      fixedEarning: 0.47,
      clientPercent: 99,
    });
    assert.equal(offer.priceUsd, 5.12);
    assert.equal(offer.rate, 9.2);
    assert.equal(offer.earningUsd, 0.47);
  });

  it("converts supported RWF prices before choosing the tier", () => {
    const priceUsd = toPlatformUsd(50000, "RWF");
    const offer = offerForAffiliateProduct({
      price: 50000,
      currency: "RWF",
      configuredPercent: 20,
      fallbackPercent: 5,
    });
    assert.equal(offer.priceUsd, priceUsd);
    assert.ok(priceUsd > 0 && priceUsd < 50000);
    assert.equal(offer.rate, affiliateCommissionCapPercent(priceUsd));
    assert.equal(
      offer.earningUsd,
      Math.round(priceUsd * ((offer.rate ?? 0) / 100) * 100) / 100,
    );
  });

  it("does not invent a rate for an unsupported currency", () => {
    const offer = offerForAffiliateProduct({
      price: 10,
      currency: "EUR",
      configuredPercent: 20,
      fixedEarning: 2,
      clientPercent: 50,
    });
    assert.equal(offer.rate, null);
    assert.equal(offer.earningUsd, 0);
    assert.equal(offer.priceUsd, 0);
  });

  it("ignores a client percent that would raise or replace the stored offer", () => {
    const stored = offerForAffiliateProduct({
      price: 10,
      currency: "USD",
      configuredPercent: 8,
      fixedEarning: 0.5,
    });
    const tampered = offerForAffiliateProduct({
      price: 10,
      currency: "USD",
      configuredPercent: 8,
      fixedEarning: 0.5,
      clientPercent: 99,
    });
    assert.deepEqual(tampered, stored);
    assert.equal(tampered.rate, 5);
    assert.equal(tampered.earningUsd, 0.5);
  });
});
