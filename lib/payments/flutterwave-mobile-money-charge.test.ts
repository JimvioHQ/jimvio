import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  getMoMoMarketByCountry,
} from "./flutterwave-mobile-money-capabilities";
import { buildFlutterwaveMobileMoneyCharge } from "./flutterwave-mobile-money";

describe("flutterwave mobile money charge payload contract", () => {
  it("Rwanda charge includes order_id and excludes network", () => {
    const market = getMoMoMarketByCountry("RW")!;
    const payload = buildFlutterwaveMobileMoneyCharge({
      market,
      amount: 108130.7,
      currency: "RWF",
      email: "buyer@example.com",
      fullName: "Test Buyer",
      txRef: "JMM_TEST_RW_1",
      orderId: "13e03b15-76e6-4eb9-b239-d87ef9b01049",
      phoneNumber: "250781234567",
      network: "MTN",
      redirectUrl: "https://www.jimvio.com/api/payments/flutterwave/callback",
    });

    assert.equal(payload.currency, "RWF");
    assert.equal(payload.amount, 108130); // integer for RWF
    assert.equal(payload.email, "buyer@example.com");
    assert.equal(payload.tx_ref, "JMM_TEST_RW_1");
    assert.equal(payload.order_id, "JMM_TEST_RW_1");
    assert.equal(payload.phone_number, "250781234567");
    assert.equal("network" in payload, false);
    assert.equal("country" in payload, false);
    assert.equal("redirect_url" in payload, false);
  });

  it("Kenya M-Pesa charge excludes network and order_id", () => {
    const market = getMoMoMarketByCountry("KE")!;
    const payload = buildFlutterwaveMobileMoneyCharge({
      market,
      amount: 10500,
      currency: "KES",
      email: "buyer@example.com",
      fullName: "Test Buyer",
      txRef: "JMM_TEST_KE_1",
      orderId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      phoneNumber: "254712345678",
      network: "MPESA",
      redirectUrl: "https://www.jimvio.com/callback",
    });

    assert.equal(payload.currency, "KES");
    assert.equal(payload.amount, 10500);
    assert.equal(payload.phone_number, "254712345678");
    assert.equal("network" in payload, false);
    assert.equal("order_id" in payload, false);
  });

  it("Uganda charge includes network + redirect_url when configured", () => {
    const market = getMoMoMarketByCountry("UG")!;
    const payload = buildFlutterwaveMobileMoneyCharge({
      market,
      amount: 50000,
      currency: "UGX",
      email: "buyer@example.com",
      fullName: "Test Buyer",
      txRef: "JMM_TEST_UG_1",
      orderId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      phoneNumber: "256700000000",
      network: "MTN",
      redirectUrl: "https://www.jimvio.com/api/payments/flutterwave/callback",
    });

    assert.equal(payload.network, "MTN");
    assert.equal(
      payload.redirect_url,
      "https://www.jimvio.com/api/payments/flutterwave/callback",
    );
    assert.equal(payload.currency, "UGX");
  });

  it("Francophone charge includes country + network and XAF/XOF currency", () => {
    const cm = getMoMoMarketByCountry("CM")!;
    const payload = buildFlutterwaveMobileMoneyCharge({
      market: cm,
      amount: 1500,
      currency: "XAF",
      email: "buyer@example.com",
      fullName: "Test Buyer",
      txRef: "JMM_TEST_CM_1",
      orderId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      phoneNumber: "237670000000",
      network: "MTN",
      redirectUrl: "https://www.jimvio.com/callback",
    });

    assert.equal(payload.country, "CM");
    assert.equal(payload.network, "MTN");
    assert.equal(payload.currency, "XAF");
    assert.equal(cm.chargeType, "mobile_money_franco");
  });

  it("Ghana charge includes country and network", () => {
    const market = getMoMoMarketByCountry("GH")!;
    const payload = buildFlutterwaveMobileMoneyCharge({
      market,
      amount: 120.5,
      currency: "GHS",
      email: "buyer@example.com",
      fullName: "Test Buyer",
      txRef: "JMM_TEST_GH_1",
      orderId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      phoneNumber: "233241234567",
      network: "MTN",
      redirectUrl: "https://www.jimvio.com/callback",
    });

    assert.equal(payload.country, "GH");
    assert.equal(payload.network, "MTN");
    assert.equal(payload.currency, "GHS");
    assert.equal(payload.amount, 120.5);
  });
});

describe("mobile money initiate schema regression", () => {
  it("does not insert nonexistent provider_reference column", () => {
    const initiate = readFileSync(
      join(process.cwd(), "app/api/payments/mobile-money/initiate/route.ts"),
      "utf8",
    );
    assert.equal(initiate.includes("provider_reference:"), false);
    assert.ok(initiate.includes("provider_transaction_id: txRef"));
    assert.ok(initiate.includes("reference: charge.flwRef"));
  });

  it("status route does not select provider_reference", () => {
    const status = readFileSync(
      join(process.cwd(), "app/api/payments/mobile-money/status/route.ts"),
      "utf8",
    );
    assert.equal(status.includes("provider_reference"), false);
  });
});
