import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isStale, oldEnoughToCheck, outcomeFromVerify } from "./reconcile-rules.ts";

const ok = (s: string) => ["successful", "success", "completed"].includes(s);

describe("payment reconciliation rules", () => {
  it("only marks paid when Flutterwave says paid with the right amount and currency", () => {
    assert.equal(outcomeFromVerify("successful", { amount: 3.93, currency: "USD" }, { amount: 3.93, currency: "usd" }, ok), "paid");
    assert.equal(outcomeFromVerify("successful", { amount: 3.93, currency: "USD" }, { amount: 1, currency: "USD" }, ok), "mismatch");
    assert.equal(outcomeFromVerify("successful", { amount: 3.93, currency: "USD" }, { amount: 3.93, currency: "RWF" }, ok), "mismatch");
  });
  it("maps failures and keeps waiting otherwise", () => {
    assert.equal(outcomeFromVerify("failed", { amount: 1, currency: "USD" }, { amount: null, currency: null }, ok), "failed");
    assert.equal(outcomeFromVerify("cancelled", { amount: 1, currency: "USD" }, { amount: null, currency: null }, ok), "failed");
    assert.equal(outcomeFromVerify("pending", { amount: 1, currency: "USD" }, { amount: null, currency: null }, ok), "pending");
  });
  it("waits a few minutes before checking and expires after a week", () => {
    const now = Date.parse("2026-11-05T12:00:00Z");
    assert.equal(oldEnoughToCheck("2026-11-05T11:59:00Z", now), false);
    assert.equal(oldEnoughToCheck("2026-11-05T11:50:00Z", now), true);
    assert.equal(isStale("2026-10-28T11:00:00Z", now), true);
    assert.equal(isStale("2026-11-01T11:00:00Z", now), false);
  });
});
