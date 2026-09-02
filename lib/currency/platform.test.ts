import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatMoneyV2 } from "./format";
import {
  PLATFORM_CURRENCY,
  isPlatformCurrency,
  marketplacePaymentErrorMessage,
  resolveCheckoutShippingAmountUsd,
  toPlatformUsd,
} from "./platform";

describe("platform USD currency", () => {
  it("identifies USD as the platform currency", () => {
    assert.equal(PLATFORM_CURRENCY, "USD");
    assert.equal(isPlatformCurrency("usd"), true);
    assert.equal(isPlatformCurrency("RWF"), false);
  });

  it("converts RWF using the existing rate instead of reinterpreting the number as USD", () => {
    const converted = toPlatformUsd(14100, "RWF");
    assert.ok(converted > 0);
    assert.ok(converted < 100);
    assert.notEqual(converted, 14100);
  });

  it("passes USD amounts through", () => {
    assert.equal(toPlatformUsd(24.5, "USD"), 24.5);
  });

  it("uses CJ priceUSD directly for checkout shipping", () => {
    assert.equal(
      resolveCheckoutShippingAmountUsd({
        isCjOrder: true,
        selected: { priceUSD: 7.02 },
      }),
      7.02,
    );
    assert.equal(
      resolveCheckoutShippingAmountUsd({ isCjOrder: true, selected: null }),
      null,
    );
    assert.equal(
      resolveCheckoutShippingAmountUsd({ isCjOrder: false, selected: null }),
      0,
    );
  });

  it("maps payment-link failures to actionable copy", () => {
    assert.match(
      marketplacePaymentErrorMessage("PAYMENT_LINK_FAILED", "currency not supported") ?? "",
      /USD/,
    );
    assert.match(
      marketplacePaymentErrorMessage("PAYMENT_LINK_FAILED", "timeout from provider") ?? "",
      /could not start/i,
    );
  });

  it("formats marketplace prices in USD without waiting for FX rates", () => {
    const formatted = formatMoneyV2(14100, "RWF", "USD", {});
    assert.match(formatted, /\$/);
    assert.equal(formatted.includes("RWF"), false);
    assert.equal(formatted.includes("14,100"), false);
    assert.equal(formatted.includes("14100"), false);
  });
});

describe("platform USD currency", () => {
  it("identifies USD as the platform currency", () => {
    assert.equal(PLATFORM_CURRENCY, "USD");
    assert.equal(isPlatformCurrency("usd"), true);
    assert.equal(isPlatformCurrency("RWF"), false);
  });

  it("converts RWF using the existing rate instead of reinterpreting the number as USD", () => {
    const converted = toPlatformUsd(14100, "RWF");
    assert.ok(converted > 0);
    assert.ok(converted < 100);
    assert.notEqual(converted, 14100);
  });

  it("passes USD amounts through", () => {
    assert.equal(toPlatformUsd(24.5, "USD"), 24.5);
  });

  it("uses CJ priceUSD directly for checkout shipping", () => {
    assert.equal(
      resolveCheckoutShippingAmountUsd({
        isCjOrder: true,
        selected: { priceUSD: 7.02 },
      }),
      7.02,
    );
    assert.equal(
      resolveCheckoutShippingAmountUsd({ isCjOrder: true, selected: null }),
      null,
    );
    assert.equal(
      resolveCheckoutShippingAmountUsd({ isCjOrder: false, selected: null }),
      0,
    );
  });

  it("maps payment-link failures to actionable copy", () => {
    assert.match(
      marketplacePaymentErrorMessage("PAYMENT_LINK_FAILED", "currency not supported") ?? "",
      /USD/,
    );
  });
});
