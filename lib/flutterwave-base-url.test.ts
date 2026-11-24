import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { getFlutterwaveApiBaseUrl } from "./flutterwave.ts";

const original = process.env.FLW_BASE_URL;

afterEach(() => {
  if (original === undefined) delete process.env.FLW_BASE_URL;
  else process.env.FLW_BASE_URL = original;
});

describe("getFlutterwaveApiBaseUrl", () => {
  it("uses the canonical endpoint when the override is missing", () => {
    delete process.env.FLW_BASE_URL;
    assert.equal(getFlutterwaveApiBaseUrl(), "https://api.flutterwave.com/v3");
  });

  it("accepts only the canonical HTTPS v3 endpoint", () => {
    process.env.FLW_BASE_URL = "https://api.flutterwave.com/v3/";
    assert.equal(getFlutterwaveApiBaseUrl(), "https://api.flutterwave.com/v3");
  });

  it("rejects untrusted hosts and protocol downgrade attempts", () => {
    for (const value of [
      "http://api.flutterwave.com/v3",
      "https://api.flutterwave.com.attacker.example/v3",
      "https://attacker.example/api/flutterwave/v3",
      "https://api.flutterwave.com.evil/v3",
    ]) {
      process.env.FLW_BASE_URL = value;
      assert.equal(getFlutterwaveApiBaseUrl(), "https://api.flutterwave.com/v3", value);
    }
  });

  it("rejects credentials, query strings, fragments, custom ports and paths", () => {
    for (const value of [
      "https://user:pass@api.flutterwave.com/v3",
      "https://api.flutterwave.com:8443/v3",
      "https://api.flutterwave.com/v3?redirect=https://attacker.example",
      "https://api.flutterwave.com/v3#fragment",
      "https://api.flutterwave.com/v3evil",
    ]) {
      process.env.FLW_BASE_URL = value;
      assert.equal(getFlutterwaveApiBaseUrl(), "https://api.flutterwave.com/v3", value);
    }
  });
});
