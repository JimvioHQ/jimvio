import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { payoutPolicyItems, withdrawalFeeText, AFFILIATE_MIN_WITHDRAWAL_USD } from "./payout-terms.ts";
import { MIN_WITHDRAWAL_AMOUNT } from "../affiliate/payout-minimum.ts";

describe("payout terms", () => {
  it("uses the enforced affiliate minimum", () => {
    assert.equal(AFFILIATE_MIN_WITHDRAWAL_USD, MIN_WITHDRAWAL_AMOUNT);
    assert.ok(payoutPolicyItems().some((t) => t.includes(`$${MIN_WITHDRAWAL_AMOUNT} USD`)));
  });
  it("derives fee text from the fee rules", () => {
    assert.equal(withdrawalFeeText("mobile_money"), "$1 + 0.5% (max $10)");
    assert.equal(withdrawalFeeText("bank"), "$2 (max $25)");
  });
  it("never claims NET-30 or a $20/$50 threshold", () => {
    const text = payoutPolicyItems().join(" ");
    assert.doesNotMatch(text, /NET-30|\$20 USD|\$50 threshold|PayPal|Stripe/);
  });
});
