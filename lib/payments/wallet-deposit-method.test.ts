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
  validateWithdrawalDestinationDetails,
  toCreatorPayoutDbMethod,
  withdrawalSpeedLabel,
  customerFacingWithdrawalStatus,
  flutterwaveTransferNetworkCode,
  MOBILE_MONEY_BY_COUNTRY,
  WALLET_WITHDRAWAL_METHODS,
} from "./wallet-payout-method";
import { calculateWithdrawalFee } from "./withdrawal-fees";
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
  it("removes PayPal and Flutterwave from selectable withdrawals", () => {
    assert.equal(normalizeWalletWithdrawalMethod("paypal"), null);
    assert.equal(normalizeWalletWithdrawalMethod("PayPal"), null);
    assert.equal(normalizeWalletWithdrawalMethod("flutterwave"), null);
    assert.equal(normalizeWalletWithdrawalMethod("flw"), null);
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

  it("keeps only four selectable withdrawal methods", () => {
    assert.deepEqual(
      [...WALLET_WITHDRAWAL_METHODS].sort(),
      ["bank", "binance_id", "crypto", "mobile_money"].sort(),
    );
  });

  it("uses neutral processing copy (no admin language)", () => {
    assert.equal(withdrawalSpeedLabel("binance_id").toLowerCase().includes("admin"), false);
    assert.equal(withdrawalSpeedLabel("crypto").toLowerCase().includes("admin"), false);
    assert.equal(customerFacingWithdrawalStatus("paid").label, "Completed");
    assert.equal(customerFacingWithdrawalStatus("pending").label, "Pending");
  });

  it("validates Rwanda bank catalog selection and custom banks", () => {
    const catalog = validateWithdrawalDestinationDetails("bank", {
      method: "bank",
      country: "RW",
      bankId: "rw_bk",
      accountHolder: "Jane Doe",
      accountNumber: "1234567890",
    });
    assert.equal(catalog.ok, true);
    if (catalog.ok) {
      assert.equal(catalog.details.bankName, "Bank of Kigali");
    }
    const custom = validateWithdrawalDestinationDetails("bank", {
      method: "bank",
      country: "RW",
      bankId: "custom",
      bankName: "My Microfinance",
      accountHolder: "Jane Doe",
      accountNumber: "1234567890",
    });
    assert.equal(custom.ok, true);
    const missingCustom = validateWithdrawalDestinationDetails("bank", {
      method: "bank",
      country: "RW",
      bankId: "custom",
      bankName: "",
      accountHolder: "Jane Doe",
      accountNumber: "1234567890",
    });
    assert.equal(missingCustom.ok, false);
  });

  it("rejects custom mobile money provider", () => {
    const ok = validateWithdrawalDestinationDetails("mobile_money", {
      method: "mobile_money",
      country: "RW",
      provider: "custom",
      customProviderName: "Local Wallet Co",
      phone: "+250788123456",
    });
    assert.equal(ok.ok, false);
  });

  it("accepts Flutterwave-aligned MoMo providers by country", () => {
    const cases: Array<{ country: string; provider: string; phone: string }> = [
      { country: "RW", provider: "mtn_momo", phone: "+250788123456" },
      { country: "RW", provider: "airtel_money", phone: "+250788123456" },
      { country: "GH", provider: "telecel_vodafone", phone: "+233241234567" },
      { country: "GH", provider: "airteltigo", phone: "+233241234567" },
      { country: "TZ", provider: "vodacom_tz", phone: "+255712345678" },
      { country: "TZ", provider: "halopesa", phone: "+255712345678" },
      { country: "UG", provider: "airtel_money", phone: "+256701234567" },
      { country: "KE", provider: "mpesa", phone: "+254712345678" },
      { country: "CI", provider: "wave", phone: "+2250701234567" },
      { country: "CM", provider: "orange_money", phone: "+237671234567" },
      { country: "SN", provider: "orange_money", phone: "+221771234567" },
      { country: "ZM", provider: "mpesa", phone: "+260971234567" },
      { country: "ET", provider: "amole", phone: "+251911234567" },
    ];
    for (const c of cases) {
      const r = validateWithdrawalDestinationDetails("mobile_money", {
        method: "mobile_money",
        country: c.country,
        provider: c.provider,
        phone: c.phone,
      });
      assert.equal(r.ok, true, `${c.country}/${c.provider} should be valid`);
    }
  });

  it("rejects cross-country MoMo providers and Vodafone/Vodacom merge mistakes", () => {
    // Ghana Telecel code must not work as Tanzania provider id
    assert.equal(
      validateWithdrawalDestinationDetails("mobile_money", {
        method: "mobile_money",
        country: "TZ",
        provider: "telecel_vodafone",
        phone: "+255712345678",
      }).ok,
      false,
    );
    // Tanzania Vodacom must not work in Ghana
    assert.equal(
      validateWithdrawalDestinationDetails("mobile_money", {
        method: "mobile_money",
        country: "GH",
        provider: "vodacom_tz",
        phone: "+233241234567",
      }).ok,
      false,
    );
    // Unsupported country
    assert.equal(
      validateWithdrawalDestinationDetails("mobile_money", {
        method: "mobile_money",
        country: "US",
        provider: "mtn_momo",
        phone: "+12025550123",
      }).ok,
      false,
    );
  });

  it("maps distinct Flutterwave transfer codes for Vodacom TZ vs Telecel GH", () => {
    assert.equal(flutterwaveTransferNetworkCode("TZ", "vodacom_tz"), "VODACOM");
    assert.equal(flutterwaveTransferNetworkCode("GH", "telecel_vodafone"), "VODAFONE");
    assert.ok(MOBILE_MONEY_BY_COUNTRY.TZ.providers.every((p) => p.id !== "custom"));
    assert.ok(MOBILE_MONEY_BY_COUNTRY.RW.providers.every((p) => p.id !== "custom"));
  });

  it("Rwanda shows MTN + Airtel and never M-Pesa; Kenya keeps M-Pesa", () => {
    const rwIds = MOBILE_MONEY_BY_COUNTRY.RW.providers.map((p) => p.id);
    assert.deepEqual(rwIds, ["mtn_momo", "airtel_money"]);
    assert.ok(!rwIds.includes("mpesa"));
    assert.equal(
      MOBILE_MONEY_BY_COUNTRY.RW.providers.some((p) => /m-?pesa/i.test(p.label)),
      false,
    );
    assert.equal(MOBILE_MONEY_BY_COUNTRY.KE.providers[0]?.id, "mpesa");
    assert.equal(flutterwaveTransferNetworkCode("RW", "mtn_momo"), "MTN");
    assert.equal(flutterwaveTransferNetworkCode("RW", "airtel_money"), "AIRTEL");
    assert.equal(flutterwaveTransferNetworkCode("RW", "mpesa"), null);
  });
});

describe("withdrawal fees", () => {
  it("computes Jimvio fee server-side and never exceeds amount", () => {
    const q = calculateWithdrawalFee("bank", 100);
    assert.equal(q.fee, 2);
    assert.equal(q.netAmount, 98);
    assert.equal(q.label, "Jimvio withdrawal fee");
    const tiny = calculateWithdrawalFee("bank", 1);
    assert.ok(tiny.fee < 1);
    assert.ok(tiny.netAmount > 0);
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
