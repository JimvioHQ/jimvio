import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clockMatchesCountry, decideCountry, trustedCountry } from "./country-trust.ts";

const day = (d: number) => `2026-10-${String(d).padStart(2, "0")}`;

describe("real country", () => {
  it("matches a Rwandan clock to Rwanda and rejects a US VPN", () => {
    const july = new Date("2026-07-01T12:00:00Z");
    assert.equal(clockMatchesCountry("RW", 120, july), true);
    assert.equal(clockMatchesCountry("US", 120, july), false);
    assert.equal(clockMatchesCountry("US", -240, july), true);
    assert.equal(clockMatchesCountry(null, 120, july), null);
  });
  it("needs several clean days before trusting a country", () => {
    const one = decideCountry([{ day: day(1), ip_country: "RW", offset_matches: true, anonymizer: false }]);
    assert.equal(one.confidence, "low");
    assert.equal(trustedCountry({ verified_country: one.country, country_confidence: one.confidence }), null);
    const three = decideCountry([1, 2, 3].map((d) => ({ day: day(d), ip_country: "RW", offset_matches: true, anonymizer: false })));
    assert.equal(three.confidence, "medium");
    assert.equal(trustedCountry({ verified_country: three.country, country_confidence: three.confidence }), "RW");
  });
  it("ignores VPN days and flags the account", () => {
    const signals = [
      ...[1, 2, 3].map((d) => ({ day: day(d), ip_country: "RW", offset_matches: true, anonymizer: false })),
      ...[4, 5].map((d) => ({ day: day(d), ip_country: "US", offset_matches: false, anonymizer: false })),
    ];
    const r = decideCountry(signals);
    assert.equal(r.country, "RW");
    assert.equal(r.vpnSuspected, true);
    assert.equal(r.confidence, "low");
  });
});
