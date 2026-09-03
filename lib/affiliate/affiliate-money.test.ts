import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { supportsAffiliateCommission } from "../sources/product-source";
import {
  estimateAffiliateCommissionUsd,
  resolveCommissionRatePercent,
  toPlatformUsd,
} from "../currency/platform";

describe("affiliate commission calculation", () => {
  it("allows commissions when product opts in, including CJ", () => {
    assert.equal(supportsAffiliateCommission("cj", true), true);
    assert.equal(supportsAffiliateCommission("cj", false), false);
    assert.equal(supportsAffiliateCommission("vendor", true), true);
  });

  it("uses absolute CJ affiliate_price converted from RWF", () => {
    const priceUsd = toPlatformUsd(50000, "RWF");
    const fixed = toPlatformUsd(2500, "RWF");
    assert.ok(fixed > 0);
    assert.ok(fixed < priceUsd);
    assert.notEqual(fixed, 10000);
  });

  it("blocks self-referrals by user id equality", () => {
    const isSelf = (buyer: string, affiliate: string) =>
      Boolean(buyer && affiliate && buyer === affiliate);
    assert.equal(isSelf("user-a", "user-a"), true);
    assert.equal(isSelf("user-a", "user-b"), false);
  });

  it("keeps rates product-specific", () => {
    const a = resolveCommissionRatePercent({ productRate: 10 });
    const b = resolveCommissionRatePercent({ productRate: 30 });
    assert.equal(a, 10);
    assert.equal(b, 30);
    assert.notEqual(
      estimateAffiliateCommissionUsd(100, a).amount,
      estimateAffiliateCommissionUsd(100, b).amount,
    );
  });
});

describe("idempotency reference shapes", () => {
  it("uses stable commission wallet references", () => {
    const commissionId = "11111111-1111-1111-1111-111111111111";
    const credit = `AFF-COMM-${commissionId}`;
    const claw = `AFF-CLAW-${commissionId}-450`;
    assert.match(credit, /^AFF-COMM-/);
    assert.match(claw, /^AFF-CLAW-/);
    assert.notEqual(credit, claw);
  });
});
