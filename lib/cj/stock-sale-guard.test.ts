import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decideCjStockSale } from "./stock-sale-guard";
import { stockQtyFromPidVariant } from "./sync-inventory";

const now = Date.parse("2026-10-13T18:00:00.000Z");

describe("CJ stock sale guard", () => {
  it("allows a fresh confirmed quantity", () => {
    const decision = decideCjStockSale({
      requestedQty: 1,
      available: 4,
      checkedAt: "2026-10-13T17:00:00.000Z",
      nowMs: now,
    });
    assert.equal(decision.ok, true);
  });

  it("does not treat missing inventory as available", () => {
    assert.equal(
      decideCjStockSale({ requestedQty: 1, available: null, checkedAt: "2026-10-13T17:00:00.000Z", nowMs: now }).ok,
      false,
    );
    assert.equal(
      decideCjStockSale({ requestedQty: 1, available: 4, checkedAt: null, nowMs: now }).ok,
      false,
    );
  });

  it("blocks stale checks, failed syncs, and shortages", () => {
    assert.equal(
      decideCjStockSale({
        requestedQty: 1,
        available: 4,
        checkedAt: "2026-10-12T00:00:00.000Z",
        nowMs: now,
      }).ok,
      false,
    );
    assert.equal(
      decideCjStockSale({
        requestedQty: 1,
        available: 4,
        checkedAt: "2026-10-13T17:00:00.000Z",
        syncStatus: "partial_failure",
        nowMs: now,
      }).ok,
      false,
    );
    const short = decideCjStockSale({
      requestedQty: 3,
      available: 2,
      checkedAt: "2026-10-13T17:00:00.000Z",
      nowMs: now,
    });
    assert.equal(short.ok, false);
    if (!short.ok) assert.equal(short.reason, "insufficient");
  });
});

describe("CJ product inventory payload", () => {
  it("sums confirmed variant rows and ignores a missing inventory list", () => {
    assert.equal(
      stockQtyFromPidVariant({
        inventory: [{ totalInventory: 4 }, { totalInventory: 1 }],
      }),
      5,
    );
    assert.equal(stockQtyFromPidVariant({ inventory: [] }), 0);
    assert.equal(stockQtyFromPidVariant({}), null);
    assert.equal(stockQtyFromPidVariant({ inventory: [{ countryCode: "CN" }] }), null);
  });
});
