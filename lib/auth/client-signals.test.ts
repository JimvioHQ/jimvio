import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseClientSignals, parseDevice } from "./client-signals.ts";

describe("client signals", () => {
  it("keeps the stored device label and adds a browser version", () => {
    const ua = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.109 Safari/537.36";
    const signals = parseClientSignals(ua);
    assert.equal(signals.deviceLabel, parseDevice(ua));
    assert.equal(signals.deviceLabel, "Chrome on macOS");
    assert.equal(signals.browser, "Chrome");
    assert.equal(signals.browserVersion, "120.0");
    assert.equal(signals.os, "macOS");
    assert.equal(signals.osVersion, "10.15");
    assert.equal(signals.category, "desktop");
  });

  it("reads a phone browser without inventing a hardware identifier", () => {
    const ua = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";
    const signals = parseClientSignals(ua);
    assert.equal(signals.deviceLabel, "Safari on iOS");
    assert.equal(signals.browserVersion, "17.4");
    assert.equal(signals.os, "iOS");
    assert.equal(signals.osVersion, "17.4");
    assert.equal(signals.category, "mobile");
    assert.equal(JSON.stringify(signals).includes("IMEI"), false);
  });

  it("returns unknown fields for an empty user agent", () => {
    const signals = parseClientSignals("");
    assert.equal(signals.category, "unknown");
    assert.equal(signals.browser, null);
    assert.equal(signals.browserVersion, null);
    assert.equal(signals.os, null);
  });
});
