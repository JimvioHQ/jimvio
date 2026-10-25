import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  accountCountryFact,
  browserLocationFact,
  checkoutAddressFact,
  choosePersonalizationCountry,
  hashIpForCache,
  ipFactFromHeaders,
  locationsConflict,
  readCachedIpCountry,
  rememberIpCountry,
  resetIpCountryCache,
} from "./location-resolution.ts";

function headers(values: Record<string, string>): { get(name: string): string | null } {
  return {
    get(name: string) {
      return values[name.toLowerCase()] ?? null;
    },
  };
}

describe("location resolution", () => {
  it("uses a declared account country ahead of an IP estimate", () => {
    const account = accountCountryFact({
      country: "Kenya",
      city: "Nairobi",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-02-01T00:00:00.000Z",
    });
    const ip = ipFactFromHeaders(headers({ "x-vercel-ip-country": "US" }));
    assert.equal(account.sourceLabel, "User-provided");
    assert.equal(account.country, "KE");
    assert.equal(choosePersonalizationCountry(account, ip), "KE");
    assert.equal(locationsConflict(account, ip), true);
  });

  it("does not personalize from the untouched Rwanda default", () => {
    const account = accountCountryFact({
      country: "RW",
      city: null,
      createdAt: "2026-04-01T00:00:00.000Z",
      updatedAt: "2026-04-01T00:01:00.000Z",
    });
    assert.equal(account.useForPersonalization, false);
    assert.match(account.note ?? "", /not been confirmed/);
    const ip = ipFactFromHeaders(headers({ "x-vercel-ip-country": "NG" }));
    assert.equal(choosePersonalizationCountry(account, ip), "NG");
  });

  it("accepts a valid IP country and rejects proxy or missing results", () => {
    const valid = ipFactFromHeaders(headers({ "cf-ipcountry": "de" }));
    assert.equal(valid.country, "DE");
    assert.equal(valid.confidence, "medium");
    assert.equal(valid.useForPersonalization, true);

    const proxy = ipFactFromHeaders(headers({ "x-vercel-ip-country": "A1" }));
    assert.equal(proxy.country, null);
    assert.equal(proxy.useForPersonalization, false);
    assert.match(proxy.note ?? "", /proxy/i);

    const tor = ipFactFromHeaders(headers({ "cf-ipcountry": "T1" }));
    assert.equal(tor.country, null);
    assert.equal(tor.useForPersonalization, false);

    const missing = ipFactFromHeaders(headers({}));
    assert.equal(missing.country, null);
    assert.equal(choosePersonalizationCountry(
      accountCountryFact({ country: null, city: null, createdAt: null, updatedAt: null }),
      missing,
    ), null);
  });

  it("does not use an IP estimate when edge providers disagree", () => {
    const fact = ipFactFromHeaders(headers({
      "x-vercel-ip-country": "US",
      "cf-ipcountry": "KE",
    }));
    assert.equal(fact.confidence, "low");
    assert.equal(fact.useForPersonalization, false);
    assert.equal(fact.country, null);
  });

  it("keeps browser permission separate from a street address", () => {
    assert.equal(browserLocationFact(null).value, "Not available");
    assert.match(browserLocationFact({ permission: "denied" }).note ?? "", /denied/);
    const granted = browserLocationFact({
      permission: "granted",
      latitude: -1.95,
      longitude: 30.06,
      accuracyMeters: 40,
      capturedAt: "2026-04-02T00:00:00.000Z",
    });
    assert.equal(granted.sourceLabel, "Browser permission");
    assert.equal(granted.country, null);
    assert.equal(granted.useForPersonalization, false);
    assert.match(granted.value, /No street address was derived/);
    assert.doesNotMatch(granted.value, /Kigali Road|address line/i);
  });

  it("keeps a checkout address separate from the IP estimate", () => {
    const checkout = checkoutAddressFact(
      [
        {
          shippingAddress: {
            country: "Uganda",
            city: "Kampala",
            line1: "12 Private Road",
          },
          paymentStatus: "paid",
          createdAt: "2026-03-01T00:00:00.000Z",
        },
      ],
      false,
    );
    assert.equal(checkout.country, "UG");
    assert.equal(checkout.sourceLabel, "Checkout address");
    assert.equal(checkout.street, null);
    assert.doesNotMatch(checkout.value, /Private Road/);
    const withStreet = checkoutAddressFact(
      [
        {
          shippingAddress: {
            country_code: "UG",
            city: "Kampala",
            line1: "12 Private Road",
          },
          paymentStatus: "paid",
          createdAt: "2026-03-01T00:00:00.000Z",
        },
      ],
      true,
    );
    assert.match(withStreet.value, /Private Road/);
    assert.match(withStreet.note ?? "", /not an IP estimate/);
  });

  it("caches a country by IP hash and expires unknown results", () => {
    resetIpCountryCache();
    const ip = "203.0.113.10";
    const hash = hashIpForCache(ip);
    assert.notEqual(hash, ip);
    rememberIpCountry(hash, {
      country: "KE",
      region: null,
      city: null,
      confidence: "medium",
      uncertain: false,
    }, 1_000);
    assert.equal(readCachedIpCountry(hash, 1_000 + 1000)?.country, "KE");
    resetIpCountryCache();
    rememberIpCountry(hash, {
      country: null,
      region: null,
      city: null,
      confidence: "none",
      uncertain: true,
    }, 1_000);
    assert.equal(readCachedIpCountry(hash, 1_000 + 61_000), undefined);
  });
});
