import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FLUTTERWAVE_MOMO_CATALOG,
  getFlutterwaveMobileMoneyCapabilities,
  getMoMoMarketByCountry,
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
    assert.ok(codes.length >= 5);
  });

  it("resolves country → currency → charge type", () => {
    const rw = getMoMoMarketByCountry("RW");
    assert.equal(rw?.currency, "RWF");
    assert.equal(rw?.chargeType, "mobile_money_rwanda");

    const ke = getMoMoMarketByCountry("KE");
    assert.equal(ke?.currency, "KES");
    assert.equal(ke?.chargeType, "mpesa");

    const gh = getMoMoMarketByCountry("GH");
    assert.equal(gh?.currency, "GHS");
    assert.equal(gh?.chargeType, "mobile_money_ghana");

    assert.equal(getMoMoMarketByCountry("US"), null);
    assert.equal(getMoMoMarketByCountry("XX"), null);
  });

  it("validates networks per market", () => {
    const ug = getMoMoMarketByCountry("UG")!;
    assert.equal(isMoMoNetworkSupported(ug, "MTN"), true);
    assert.equal(isMoMoNetworkSupported(ug, "AIRTEL"), true);
    assert.equal(isMoMoNetworkSupported(ug, "WAVE"), false);
    assert.equal(resolveMoMoNetwork(ug, "mtn"), "MTN");

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

  it("serializes client capabilities without secrets", () => {
    const json = JSON.stringify(serializeMoMoCapabilitiesForClient());
    assert.equal(json.includes("SECRET"), false);
    assert.equal(json.includes("FLW_"), false);
    assert.ok(json.includes("countryCode"));
    assert.ok(json.includes("networks"));
  });

  it("catalog charge types match Flutterwave direct-charge APIs", () => {
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
