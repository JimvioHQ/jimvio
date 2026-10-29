import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildBalanceSeries, incomeBySource } from "./history.ts";

const now = new Date("2026-10-29T18:00:00Z");

describe("wallet balance history", () => {
  it("is a flat line at zero with no activity", () => {
    const s = buildBalanceSeries(0, [], 7, now);
    assert.equal(s.length, 7);
    assert.ok(s.every((p) => p.balance === 0));
    assert.equal(s[6].date, "2026-10-29");
  });
  it("rises on the day money came in", () => {
    const s = buildBalanceSeries(5, [{ amount: 5, direction: "credit", status: "pending", createdAt: "2026-10-29T12:53:00Z", surface: "ugc" }], 7, now);
    assert.equal(s[5].balance, 0);
    assert.equal(s[6].balance, 5);
  });
  it("ignores failed rows and subtracts withdrawals", () => {
    const s = buildBalanceSeries(
      30,
      [
        { amount: 50, direction: "credit", status: "completed", createdAt: "2026-10-27T10:00:00Z", surface: "marketplace" },
        { amount: 20, direction: "debit", status: "paid", createdAt: "2026-10-28T10:00:00Z", surface: "withdrawals" },
        { amount: 99, direction: "credit", status: "failed", createdAt: "2026-10-28T10:00:00Z", surface: "deposits" },
      ],
      4,
      now,
    );
    assert.deepEqual(s.map((p) => p.balance), [0, 50, 30, 30]);
  });
  it("groups income by source", () => {
    const r = incomeBySource([
      { amount: 5, direction: "credit", status: "pending", createdAt: "2026-10-29T00:00:00Z", surface: "ugc" },
      { amount: 3, direction: "credit", status: "completed", createdAt: "2026-10-29T00:00:00Z", surface: "community" },
      { amount: 2, direction: "debit", status: "paid", createdAt: "2026-10-29T00:00:00Z", surface: "withdrawals" },
    ]);
    assert.deepEqual(r, [{ surface: "ugc", amount: 5 }, { surface: "community", amount: 3 }]);
  });
});
