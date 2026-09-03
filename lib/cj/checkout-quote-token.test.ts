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
    });
    assert.ok(trusted);
    assert.equal(trusted?.priceUSD, 12.5);
  });

  it("rejects tampered tokens and mismatched carts", () => {
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
});
