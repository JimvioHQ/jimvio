import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  amountsMatchFee,
  BUSINESS_VERIFICATION_FEE_CURRENCY,
  BUSINESS_VERIFICATION_FEE_PURPOSE,
  BUSINESS_VERIFICATION_FEE_USD,
  formatBusinessVerificationFee,
} from "./business-verification-fee";

describe("business verification fee", () => {
  it("locks the Jimvio fee at $5.65 USD", () => {
    assert.equal(BUSINESS_VERIFICATION_FEE_USD, 5.65);
    assert.equal(BUSINESS_VERIFICATION_FEE_CURRENCY, "USD");
    assert.equal(BUSINESS_VERIFICATION_FEE_PURPOSE, "business_verification_fee");
    assert.equal(formatBusinessVerificationFee(), "$5.65 USD");
  });

  it("rejects client amount tampering", () => {
    assert.equal(amountsMatchFee(0, "USD"), false);
    assert.equal(amountsMatchFee(0.01, "USD"), false);
    assert.equal(amountsMatchFee(1, "USD"), false);
    assert.equal(amountsMatchFee(5.65, "EUR"), false);
    assert.equal(amountsMatchFee(5.65, "USD"), true);
    assert.equal(amountsMatchFee(5.649, "USD"), true);
    assert.equal(amountsMatchFee(null, "USD"), false);
  });
});
