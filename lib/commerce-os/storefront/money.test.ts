import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { salePercent, formatStoreMoney } from "./money";

describe("storefront product card helpers", () => {
  it("computes sale percent from real compare_at", () => {
    assert.equal(salePercent(60, 100), 40);
    assert.equal(salePercent(100, 100), null);
    assert.equal(salePercent(120, 100), null);
  });

  it("formats currency safely", () => {
    const s = formatStoreMoney(44.99, "USD");
    assert.match(s, /44/);
  });
});
