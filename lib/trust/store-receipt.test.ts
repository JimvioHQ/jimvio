import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildTrustReceiptLines } from "./store-receipt.ts";

const base = {
  verified: false,
  since: "2026-03-14T10:00:00Z",
  liveProducts: 12,
  paidOrders: 0,
  deliveredOrders: 0,
  disputes: 0,
  reviewCount: 0,
  avgRating: null,
};

describe("trust receipt", () => {
  it("states plainly when there is no history yet", () => {
    const lines = buildTrustReceiptLines(base);
    const v = Object.fromEntries(lines.map((l) => [l.id, l.value]));
    assert.equal(v.identity, "Not verified yet");
    assert.equal(v.since, "Mar 2026");
    assert.equal(v.orders, "None yet");
    assert.equal(v.reviews, "None yet");
    assert.equal(v.disputes, "None");
  });
  it("shows real counts and verified-buyer rating", () => {
    const lines = buildTrustReceiptLines({ ...base, verified: true, paidOrders: 1204, deliveredOrders: 1100, disputes: 3, reviewCount: 40, avgRating: 4.25 });
    const v = Object.fromEntries(lines.map((l) => [l.id, l.value]));
    assert.equal(v.identity, "Verified by Jimvio");
    assert.equal(v.orders, "1,204 · 1,100 delivered");
    assert.equal(v.disputes, "3");
    assert.equal(v.reviews, "4.3 / 5 · 40");
  });
});
