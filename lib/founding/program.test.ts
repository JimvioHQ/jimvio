import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { communityFeeRate, seatLabel } from "./program.ts";

describe("founding creators", () => {
  const now = new Date("2026-11-01T00:00:00Z");
  it("uses the founding rate only while it lasts", () => {
    assert.equal(communityFeeRate(15, { fee_rate: 10, fee_until: "2027-10-29T00:00:00Z" }, now), 10);
    assert.equal(communityFeeRate(15, { fee_rate: 10, fee_until: "2026-10-01T00:00:00Z" }, now), 15);
    assert.equal(communityFeeRate(15, null, now), 15);
  });
  it("never raises a fee that is already lower", () => {
    assert.equal(communityFeeRate(5, { fee_rate: "10", fee_until: "2027-10-29T00:00:00Z" }, now), 5);
  });
  it("formats the seat", () => {
    assert.equal(seatLabel(7), "Founding Creator #007");
  });
});
