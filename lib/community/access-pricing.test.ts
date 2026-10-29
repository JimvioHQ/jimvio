import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  accessPlanExpiry,
  accessPlans,
  accessPricingFromRow,
  accessPricingToPatch,
  validateAccessPricing,
} from "./access-pricing.ts";

describe("community access pricing", () => {
  it("free clears every price", () => {
    const p = accessPricingToPatch({ paid: false, price: 9, billingType: "subscription", interval: "monthly", compareAtPrice: 20, affiliateCommission: 10 });
    assert.equal(p.is_free, true);
    assert.equal(p.monthly_price, null);
    assert.equal(p.compare_at_price, null);
    assert.equal(p.affiliate_commission_rate, null);
  });

  it("a quarterly subscription keeps only the quarterly price and round-trips", () => {
    const form = { paid: true, price: 25, billingType: "subscription" as const, interval: "quarterly" as const, compareAtPrice: 40, affiliateCommission: 20 };
    const patch = accessPricingToPatch(form);
    assert.equal(patch.quarterly_price, 25);
    assert.equal(patch.monthly_price, null);
    assert.equal(patch.billing_interval, "quarterly");
    assert.deepEqual(accessPricingFromRow(patch), form);
    assert.deepEqual(accessPlans(patch).map((p) => p.key), ["quarterly"]);
  });

  it("one-time uses the lifetime price", () => {
    const patch = accessPricingToPatch({ paid: true, price: 99, billingType: "one_time", interval: "monthly", compareAtPrice: null, affiliateCommission: null });
    assert.equal(patch.lifetime_price, 99);
    assert.equal(patch.billing_interval, null);
    assert.deepEqual(accessPlans(patch).map((p) => p.key), ["lifetime"]);
  });

  it("reads older rows that only have monthly and yearly prices", () => {
    const form = accessPricingFromRow({ is_free: false, monthly_price: "10", yearly_price: "100" });
    assert.equal(form.billingType, "subscription");
    assert.equal(form.interval, "monthly");
    assert.equal(form.price, 10);
    assert.deepEqual(accessPlans({ monthly_price: 10, yearly_price: 100 }).map((p) => p.key), ["monthly", "yearly"]);
  });

  it("validates price, compare-at and commission", () => {
    const base = { paid: true, price: 10, billingType: "subscription" as const, interval: "monthly" as const, compareAtPrice: null, affiliateCommission: null };
    assert.equal(validateAccessPricing(base), null);
    assert.equal(validateAccessPricing({ ...base, price: 0 })?.field, "price");
    assert.equal(validateAccessPricing({ ...base, compareAtPrice: 5 })?.field, "compareAtPrice");
    assert.equal(validateAccessPricing({ ...base, affiliateCommission: 95 })?.field, "affiliateCommission");
    assert.equal(validateAccessPricing({ ...base, paid: false, price: null }), null);
  });

  it("computes when each plan ends", () => {
    const from = new Date("2026-01-01T00:00:00Z");
    assert.equal(accessPlanExpiry("weekly", from)?.slice(0, 10), "2026-01-08");
    assert.equal(accessPlanExpiry("quarterly", from)?.slice(0, 10), "2026-04-01");
    assert.equal(accessPlanExpiry("lifetime", from), null);
  });
});
