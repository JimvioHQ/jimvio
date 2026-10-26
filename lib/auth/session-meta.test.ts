import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sessionMetaFromHeaders } from "./session-meta.ts";

function headers(values: Record<string, string>) {
  return {
    get(name: string) {
      return values[name.toLowerCase()] ?? null;
    },
  };
}

describe("session request meta", () => {
  it("keeps an IP city beside the country and does not treat a proxy code as a country", () => {
    const city = sessionMetaFromHeaders(headers({
      "user-agent": "Mozilla/5.0 Chrome/120.0.0.0",
      "x-vercel-ip-country": "KE",
      "x-vercel-ip-country-region": "30",
      "x-vercel-ip-city": "Nairobi",
    }));
    assert.equal(city.country, "KE");
    assert.equal(city.region, "30");
    assert.equal(city.city, "Nairobi");
    assert.equal(city.networkSignal, "none");

    const proxy = sessionMetaFromHeaders(headers({
      "x-vercel-ip-country": "A1",
      "x-vercel-ip-city": "Hidden",
    }));
    assert.equal(proxy.country, undefined);
    assert.equal(proxy.city, null);
    assert.equal(proxy.networkSignal, "anonymizer");
  });

  it("drops the country when edge headers disagree or are missing", () => {
    const disagreed = sessionMetaFromHeaders(headers({
      "x-vercel-ip-country": "US",
      "cf-ipcountry": "KE",
    }));
    assert.equal(disagreed.country, undefined);
    assert.equal(disagreed.networkSignal, "disagreement");

    const missing = sessionMetaFromHeaders(headers({}));
    assert.equal(missing.country, undefined);
    assert.equal(missing.networkSignal, null);
    assert.equal(missing.userAgent, "Unknown browser");
  });
});
