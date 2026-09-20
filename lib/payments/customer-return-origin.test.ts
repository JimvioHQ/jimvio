import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCustomerPaymentReturnUrls,
  storefrontCustomerOrigin,
} from "./customer-return-origin.ts";

describe("customer payment return origins", () => {
  it("builds merchant host returns for a store handle", () => {
    const prev = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = "https://www.jimvio.com";
    try {
      const origin = storefrontCustomerOrigin("p7-provider-store");
      assert.equal(origin, "https://p7-provider-store.jimvio.com");
      const urls = buildCustomerPaymentReturnUrls({
        orderId: "11111111-1111-1111-1111-111111111111",
        storeHandle: "p7-provider-store",
      });
      assert.match(urls.successUrl, /^https:\/\/p7-provider-store\.jimvio\.com\/checkout\/success/);
      assert.match(urls.cancelUrl, /^https:\/\/p7-provider-store\.jimvio\.com\/checkout\/cancel/);
      assert.doesNotMatch(urls.successUrl, /www\.jimvio\.com/);
    } finally {
      if (prev === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
      else process.env.NEXT_PUBLIC_APP_URL = prev;
    }
  });

  it("rejects invalid handles", () => {
    assert.equal(storefrontCustomerOrigin("../evil"), null);
    assert.equal(storefrontCustomerOrigin("www"), null);
  });

  it("falls back to platform app URL without a store handle", () => {
    const prev = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = "https://www.jimvio.com";
    try {
      const urls = buildCustomerPaymentReturnUrls({
        orderId: "11111111-1111-1111-1111-111111111111",
      });
      assert.match(urls.successUrl, /^https:\/\/www\.jimvio\.com\/checkout\/success/);
    } finally {
      if (prev === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
      else process.env.NEXT_PUBLIC_APP_URL = prev;
    }
  });
});
