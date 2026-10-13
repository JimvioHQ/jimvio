import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createCheckoutQuoteToken,
  resolveTrustedRateFromQuoteToken,
  verifyCheckoutQuoteToken,
} from "./checkout-quote-token";

describe("checkout quote token", () => {
  it("signs and verifies a shipping quote for set-shipping reuse", () => {
    process.env.CHECKOUT_QUOTE_SECRET = "test-quote-secret";
    const products = [{ vid: "VID-1", quantity: 2 }];
    const rates = [
      {
        optionId: "ILL",
        channelId: "ILL",
        name: "International Liquid Line",
        arrivalDays: "7-14",
        priceUSD: 12.5,
      },
    ];

    const token = createCheckoutQuoteToken({
      destCountryCode: "RW",
      orderCurrency: "USD",
      products,
      rates,
      orderIds: ["11111111-1111-1111-1111-111111111111"],
    });

    const payload = verifyCheckoutQuoteToken(token);
    assert.ok(payload);
    assert.equal(payload?.dest, "RW");
    assert.equal(payload?.rates[0]?.priceUSD, 12.5);

    const trusted = resolveTrustedRateFromQuoteToken({
      token,
      selection: { name: "International Liquid Line", optionId: "ILL", priceUSD: 12.5 },
      products,
      destCountryCode: "RW",
      orderIds: ["11111111-1111-1111-1111-111111111111"],
    });
    assert.ok(trusted);
    assert.equal(trusted?.priceUSD, 12.5);
  });

  it("matches order-bound quotes even when product weights differ", () => {
    process.env.CHECKOUT_QUOTE_SECRET = "test-quote-secret";
    const orderId = "22222222-2222-2222-2222-222222222222";
    const rates = [
      {
        optionId: "STD",
        channelId: "STD",
        name: "Standard",
        arrivalDays: "10-20",
        priceUSD: 8,
      },
    ];
    const token = createCheckoutQuoteToken({
      destCountryCode: "US",
      orderCurrency: "USD",
      products: [{ vid: "VID-1", quantity: 1, weight: 120 }],
      rates,
      orderIds: [orderId],
    });

    const trusted = resolveTrustedRateFromQuoteToken({
      token,
      selection: { name: "Standard", optionId: "STD", priceUSD: 8 },
      // Pay-time DB rebuild often omits weight — must still reuse the quote.
      products: [{ vid: "VID-1", quantity: 1 }],
      destCountryCode: "US",
      orderIds: [orderId],
    });
    assert.ok(trusted);
    assert.equal(trusted?.optionId, "STD");
  });

  it("rejects tampered tokens and mismatched carts without order binding", () => {
    process.env.CHECKOUT_QUOTE_SECRET = "test-quote-secret";
    const products = [{ vid: "VID-1", quantity: 1 }];
    const rates = [
      {
        optionId: "STD",
        channelId: "STD",
        name: "Standard",
        arrivalDays: "10-20",
        priceUSD: 8,
      },
    ];
    const token = createCheckoutQuoteToken({
      destCountryCode: "US",
      orderCurrency: "USD",
      products,
      rates,
    });

    assert.equal(verifyCheckoutQuoteToken(token + "x"), null);
    assert.equal(
      resolveTrustedRateFromQuoteToken({
        token,
        selection: { name: "Standard", optionId: "STD" },
        products: [{ vid: "VID-2", quantity: 1 }],
        destCountryCode: "US",
      }),
      null
    );
  });

  it("binds the signed amount to the order and destination and rejects an expired quote", () => {
    process.env.CHECKOUT_QUOTE_SECRET = "test-quote-secret";
    const orderId = "33333333-3333-3333-3333-333333333333";
    const rates = [
      {
        optionId: "ILL",
        channelId: "ILL",
        name: "International Liquid Line",
        arrivalDays: "20-60",
        priceUSD: 26.94,
      },
    ];
    const token = createCheckoutQuoteToken({
      destCountryCode: "RW",
      orderCurrency: "USD",
      products: [{ vid: "VID-9", quantity: 1 }],
      rates,
      orderIds: [orderId],
    });

    const trusted = resolveTrustedRateFromQuoteToken({
      token,
      selection: { name: "International Liquid Line", optionId: "ILL", priceUSD: 1 },
      products: [],
      destCountryCode: "RW",
      orderIds: [orderId],
    });
    assert.equal(trusted?.priceUSD, 26.94);

    assert.equal(
      resolveTrustedRateFromQuoteToken({
        token,
        selection: { name: "International Liquid Line", optionId: "ILL", priceUSD: 26.94 },
        products: [],
        destCountryCode: "US",
        orderIds: [orderId],
      }),
      null
    );
    assert.equal(
      resolveTrustedRateFromQuoteToken({
        token,
        selection: { name: "International Liquid Line", optionId: "ILL", priceUSD: 26.94 },
        products: [],
        destCountryCode: "RW",
        orderIds: ["44444444-4444-4444-4444-444444444444"],
      }),
      null
    );

    const expired = createCheckoutQuoteToken({
      destCountryCode: "RW",
      orderCurrency: "USD",
      products: [{ vid: "VID-9", quantity: 1 }],
      rates,
      orderIds: [orderId],
      ttlMs: -(3 * 60 * 60 * 1000),
    });
    assert.equal(verifyCheckoutQuoteToken(expired), null);
  });
});
