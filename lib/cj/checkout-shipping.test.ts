import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { usableCjVid } from "./variant-vid";
import { toCheckoutFreightProducts } from "./checkout-shipping";
import { isCjApiQuotaError, sanitizeCustomerError, CJ_CUSTOMER_MESSAGES } from "./customer-errors-shared";
import { resolveQuotaCircuitTtlMs } from "./quota-circuit";
import { normalizeCountryCode } from "@/lib/geo/buyer-country";

describe("checkout freight vids", () => {
  it("keeps a real CJ vid and drops empty values", () => {
    const products = toCheckoutFreightProducts([
      { vid: "2410080916471625800", quantity: 1, weight: 120 },
      { vid: "  ", quantity: 1 },
      { vid: null, quantity: 2 },
    ]);
    assert.equal(products.length, 1);
    assert.equal(products[0]?.vid, "2410080916471625800");
    assert.equal(products[0]?.weight, 120);
  });

  it("does not invent a default weight", () => {
    const products = toCheckoutFreightProducts([{ vid: "V1", quantity: 1 }]);
    assert.equal(products[0]?.weight, undefined);
  });

  it("accepts UUID-shaped CJ vids that came from the cj_vid column", () => {
    assert.equal(usableCjVid("F3DB702E-6A68-4C55-B8AE-6A8A42EB41C3"), "F3DB702E-6A68-4C55-B8AE-6A8A42EB41C3");
  });
});

describe("checkout shipping quota errors", () => {
  it("does not disguise CJ API quota as an address problem", () => {
    const raw =
      "Insufficient API points. Used today: 88040, Remaining: 0, Required: 10. https://developers.cjdropshipping.cn/en/api/api2/standard/points.html";
    assert.equal(isCjApiQuotaError(raw), true);
    const message = sanitizeCustomerError(raw, CJ_CUSTOMER_MESSAGES.shippingRates);
    assert.equal(message, CJ_CUSTOMER_MESSAGES.shippingQuota);
    assert.match(message, /temporarily unavailable/i);
    assert.equal(message.includes("address"), false);
    assert.equal(message.toLowerCase().includes("cj"), false);
  });

  it("opens a long circuit when Remaining is 0", () => {
    const ttl = resolveQuotaCircuitTtlMs(
      "Insufficient API points. Used today: 84610, Remaining: 0, Required: 10."
    );
    assert.ok(ttl >= 30 * 60 * 1000);
  });
});

describe("checkout country normalization", () => {
  it("maps Rwanda / RW consistently", () => {
    assert.equal(normalizeCountryCode("RW"), "RW");
    assert.equal(normalizeCountryCode("rw"), "RW");
    assert.equal(normalizeCountryCode("Rwanda"), "RW");
    assert.equal(normalizeCountryCode("United States"), "US");
    assert.equal(normalizeCountryCode("united kingdom"), "GB");
  });
});
