import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FLUTTERWAVE_MOMO_CATALOG,
  getFlutterwaveMobileMoneyCapabilities,
  getMoMoMarketByCountry,
  isMoMoCountrySupported,
  isMoMoNetworkSupported,
  normalizeMoMoPhone,
  resolveMoMoNetwork,
  serializeMoMoCapabilitiesForClient,
} from "./flutterwave-mobile-money-capabilities";

describe("flutterwave mobile money capabilities", () => {
  it("includes multiple African markets, not Rwanda only", () => {
    const caps = getFlutterwaveMobileMoneyCapabilities();
    const codes = caps.map((c) => c.countryCode);
    assert.ok(codes.includes("RW"));
    assert.ok(codes.includes("KE"));
    assert.ok(codes.includes("GH"));
    assert.ok(codes.includes("UG"));
    assert.ok(codes.includes("TZ"));
    assert.ok(codes.includes("CM"));
    assert.ok(codes.includes("CI"));
    assert.ok(codes.includes("SN"));
    assert.ok(codes.length >= 5);
    // Malawi has payment_options docs but no v3 direct-charge collection endpoint.
    assert.equal(codes.includes("MW"), false);
  });

  it("resolves country → currency → charge type + auth mode", () => {
    const rw = getMoMoMarketByCountry("RW");
    assert.equal(rw?.currency, "RWF");
    assert.equal(rw?.chargeType, "mobile_money_rwanda");
    assert.equal(rw?.authorizationMode, "redirect");

    const ke = getMoMoMarketByCountry("KE");
    assert.equal(ke?.currency, "KES");
    assert.equal(ke?.chargeType, "mpesa");
    assert.equal(ke?.authorizationMode, "push");
    assert.equal(ke?.requiresNetwork, false);

    const gh = getMoMoMarketByCountry("GH");
    assert.equal(gh?.currency, "GHS");
    assert.equal(gh?.chargeType, "mobile_money_ghana");

    assert.equal(getMoMoMarketByCountry("US"), null);
    assert.equal(isMoMoCountrySupported("US"), false);
    assert.equal(isMoMoCountrySupported("KE"), true);
  });

  it("validates networks per market — never invents global networks", () => {
    const ug = getMoMoMarketByCountry("UG")!;
    assert.equal(isMoMoNetworkSupported(ug, "MTN"), true);
    assert.equal(isMoMoNetworkSupported(ug, "AIRTEL"), true);
    assert.equal(isMoMoNetworkSupported(ug, "WAVE"), false);
    assert.equal(resolveMoMoNetwork(ug, "mtn"), "MTN");

    const sn = getMoMoMarketByCountry("SN")!;
    assert.equal(isMoMoNetworkSupported(sn, "WAVE"), true);
    assert.equal(isMoMoNetworkSupported(sn, "MTN"), false);

    const ke = getMoMoMarketByCountry("KE")!;
    assert.equal(isMoMoNetworkSupported(ke, null), true);
    assert.equal(resolveMoMoNetwork(ke, null), "MPESA");
  });

  it("normalizes phones in a country-aware way", () => {
    const rw = getMoMoMarketByCountry("RW")!;
    const ok = normalizeMoMoPhone(rw, "0781234567");
    assert.equal(ok.ok, true);
    if (ok.ok) {
      assert.equal(ok.e164Digits, "250781234567");
      assert.ok(!ok.masked.includes("781234567"));
    }

    const bad = normalizeMoMoPhone(rw, "123");
    assert.equal(bad.ok, false);

    const ke = getMoMoMarketByCountry("KE")!;
    const keOk = normalizeMoMoPhone(ke, "+254712345678");
    assert.equal(keOk.ok, true);
    if (keOk.ok) assert.equal(keOk.e164Digits, "254712345678");

    const gh = getMoMoMarketByCountry("GH")!;
    const ghOk = normalizeMoMoPhone(gh, "0244123456");
    assert.equal(ghOk.ok, true);
    if (ghOk.ok) assert.equal(ghOk.e164Digits, "233244123456");
  });

  it("serializes client capabilities without secrets or charge internals", () => {
    const payload = serializeMoMoCapabilitiesForClient();
    const json = JSON.stringify(payload);
    assert.equal(json.includes("SECRET"), false);
    assert.equal(json.includes("FLW_"), false);
    assert.equal(json.includes("chargeType"), false);
    assert.ok(json.includes("countryCode"));
    assert.ok(json.includes("networks"));
    assert.ok(json.includes("authorizationMode"));
    assert.ok(payload.every((m) => Array.isArray(m.networks)));
  });

  it("catalog charge types match Flutterwave direct-charge collection APIs", () => {
    const types = new Set(FLUTTERWAVE_MOMO_CATALOG.map((m) => m.chargeType));
    assert.ok(types.has("mobile_money_rwanda"));
    assert.ok(types.has("mpesa"));
    assert.ok(types.has("mobile_money_ghana"));
    assert.ok(types.has("mobile_money_uganda"));
    assert.ok(types.has("mobile_money_tanzania"));
    assert.ok(types.has("mobile_money_zambia"));
    assert.ok(types.has("mobile_money_franco"));
  });
});
