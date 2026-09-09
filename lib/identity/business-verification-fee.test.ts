import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  amountsMatchFee,
  BUSINESS_VERIFICATION_FEE_CURRENCY,
  BUSINESS_VERIFICATION_FEE_PURPOSE,
  BUSINESS_VERIFICATION_FEE_USD,
  formatBusinessVerificationFee,
  normalizeVerificationFeeMethod,
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
    assert.equal(amountsMatchFee(103.91, "USD"), false);
    assert.equal(amountsMatchFee(5.65, "EUR"), false);
    assert.equal(amountsMatchFee(5.65, "USD"), true);
    assert.equal(amountsMatchFee(5.649, "USD"), true);
    assert.equal(amountsMatchFee(null, "USD"), false);
  });

  it("accepts USDT and exact RWF equivalent charges", () => {
    assert.equal(amountsMatchFee(5.65, "USDT"), true);
    assert.equal(amountsMatchFee(7063, "RWF", 7063), true);
    assert.equal(amountsMatchFee(999999, "RWF", 7063), false);
  });

  it("normalizes payment method aliases", () => {
    assert.equal(normalizeVerificationFeeMethod("card"), "flutterwave");
    assert.equal(normalizeVerificationFeeMethod("crypto"), "nowpayments");
    assert.equal(normalizeVerificationFeeMethod("binance_pay"), "binancepay");
    assert.equal(normalizeVerificationFeeMethod("momo"), "mobile_money");
    assert.equal(normalizeVerificationFeeMethod("stripe"), null);
  });
});
