import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  salePercent,
  formatStoreMoney,
  formatStorefrontMoney,
  resolveStorefrontDisplayAmount,
} from "./money.ts";

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

  it("converts RWF catalog prices to store USD without relabeling", () => {
    const resolved = resolveStorefrontDisplayAmount(7400, "RWF", "USD");
    assert.equal(resolved.currency, "USD");
    // 7400 * 0.0008 default rate = 5.92
    assert.equal(resolved.amount, 5.92);
    const formatted = formatStorefrontMoney(7400, "RWF", "USD");
    assert.match(formatted, /\$/);
    assert.doesNotMatch(formatted, /RWF|FRw/i);
  });

  it("passes through USD amounts unchanged", () => {
    const resolved = resolveStorefrontDisplayAmount(7.4, "USD", "USD");
    assert.equal(resolved.amount, 7.4);
    assert.equal(resolved.currency, "USD");
  });
});
