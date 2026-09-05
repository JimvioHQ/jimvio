import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isWalletDepositInitiable,
  normalizeWalletDepositMethod,
  walletDepositMethodLabel,
  walletDepositProviderId,
  WALLET_DEPOSIT_DB_METHODS,
} from "./wallet-deposit-method";
import {
  normalizeWalletWithdrawalMethod,
  validateWithdrawalDestination,
  toCreatorPayoutDbMethod,
} from "./wallet-payout-method";
import { safeDepositInitiateError } from "./safe-payment-error";

describe("wallet deposit method normalization", () => {
  it("maps UI MethodIds to canonical DB values", () => {
    assert.equal(normalizeWalletDepositMethod("nowpayments"), "nowpayments");
    assert.equal(normalizeWalletDepositMethod("crypto"), "nowpayments");
    assert.equal(normalizeWalletDepositMethod("Cryptocurrency"), "nowpayments");
    assert.equal(normalizeWalletDepositMethod("binancepay"), "binancepay");
    assert.equal(normalizeWalletDepositMethod("binance_pay"), "binancepay");
    assert.equal(normalizeWalletDepositMethod("flutterwave"), "flutterwave");
    assert.equal(normalizeWalletDepositMethod("mobile_money"), "mobile_money");
  });

  it("rejects unknown methods", () => {
    assert.equal(normalizeWalletDepositMethod("stripe"), null);
    assert.equal(normalizeWalletDepositMethod(""), null);
  });

  it("marks only initiable providers as depositable", () => {
    assert.equal(isWalletDepositInitiable("nowpayments"), true);
    assert.equal(isWalletDepositInitiable("binancepay"), true);
    assert.equal(isWalletDepositInitiable("flutterwave"), true);
    assert.equal(isWalletDepositInitiable("paypal"), false);
    assert.equal(isWalletDepositInitiable("pesapal"), false);
  });

  it("keeps DB allowlist controlled", () => {
    assert.ok(WALLET_DEPOSIT_DB_METHODS.includes("nowpayments"));
    assert.ok(WALLET_DEPOSIT_DB_METHODS.includes("binancepay"));
    assert.ok(WALLET_DEPOSIT_DB_METHODS.includes("crypto"));
    assert.equal(walletDepositProviderId("crypto"), "nowpayments");
    assert.equal(walletDepositMethodLabel("nowpayments"), "Cryptocurrency");
    assert.equal(walletDepositMethodLabel("binancepay"), "Binance Pay");
  });
});

describe("wallet withdrawal method normalization", () => {
  it("removes PayPal from selectable withdrawals", () => {
    assert.equal(normalizeWalletWithdrawalMethod("paypal"), null);
    assert.equal(normalizeWalletWithdrawalMethod("PayPal"), null);
  });

  it("supports Binance ID and legacy bank aliases", () => {
    assert.equal(normalizeWalletWithdrawalMethod("binance_id"), "binance_id");
    assert.equal(normalizeWalletWithdrawalMethod("binance"), "binance_id");
    assert.equal(normalizeWalletWithdrawalMethod("bank_transfer"), "bank");
    assert.equal(toCreatorPayoutDbMethod("binance_id"), "binance_id");
  });

  it("validates Binance ID as numeric", () => {
    assert.equal(validateWithdrawalDestination("binance_id", "12345678").ok, true);
    assert.equal(validateWithdrawalDestination("binance_id", "abc").ok, false);
    assert.equal(validateWithdrawalDestination("binance_id", "12").ok, false);
  });
});

describe("safe payment errors", () => {
  it("never exposes constraint / SQL text", () => {
    const msg = safeDepositInitiateError(
      "binancepay",
      new Error(
        'new row for relation "wallet_deposits" violates check constraint "wallet_deposits_method_check"',
      ),
    );
    assert.equal(msg, "Binance Pay could not be started. Please try again.");
    assert.ok(!/constraint/i.test(msg));
    assert.ok(!/wallet_deposits/i.test(msg));
  });
});
