import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_AFFILIATE_COMMISSION_PERCENT,
  estimateAffiliateCommissionUsd,
  formatMoneyAsUSD,
  formatUSD,
  resolveCommissionRatePercent,
  toPlatformUsd,
} from "./platform";

describe("formatUSD", () => {
  it("formats cents consistently", () => {
    assert.equal(formatUSD(0), "$0.00");
    assert.equal(formatUSD(12.5), "$12.50");
    assert.equal(formatUSD(1250), "$1,250.00");
  });

  it("converts RWF before formatting — never reinterprets as dollars", () => {
    const formatted = formatMoneyAsUSD(14100, "RWF");
    assert.match(formatted, /\$/);
    assert.equal(formatted.includes("RWF"), false);
    assert.equal(formatted.includes("14,100"), false);
    assert.ok(toPlatformUsd(14100, "RWF") < 100);
  });
});

describe("variable commission rates", () => {
  it("prefers product-specific rates over defaults", () => {
    assert.equal(
      resolveCommissionRatePercent({
        productRate: 15,
        platformDefault: DEFAULT_AFFILIATE_COMMISSION_PERCENT,
      }),
      15,
    );
    assert.equal(
      resolveCommissionRatePercent({
        linkRate: 25,
        productRate: 15,
        platformDefault: 5,
      }),
      25,
    );
    assert.equal(
      resolveCommissionRatePercent({
        productRate: null,
        platformDefault: 5,
      }),
      5,
    );
  });

  it("computes earnings from real rates", () => {
    assert.equal(estimateAffiliateCommissionUsd(29.99, 15).amount, 4.5);
    assert.equal(estimateAffiliateCommissionUsd(79.99, 25).amount, 20);
    assert.notEqual(estimateAffiliateCommissionUsd(100, 10).amount, 20);
  });
});
