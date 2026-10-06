import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatCommerceMoney,
  sumCommerceUsd,
  toCommerceUsd,
} from "./money.ts";

describe("formatCommerceMoney", () => {
  it("converts catalog RWF prices to USD (never RWF label)", () => {
    assert.equal(formatCommerceMoney(4500, "RWF"), "$3.60");
    assert.equal(formatCommerceMoney(1300, "RWF"), "$1.04");
    assert.equal(formatCommerceMoney(7400, "RWF"), "$5.92");
    assert.doesNotMatch(formatCommerceMoney(4500, "RWF"), /RWF|FRw/i);
  });

  it("passes USD through unchanged", () => {
    assert.equal(formatCommerceMoney(3.6, "USD"), "$3.60");
    assert.equal(toCommerceUsd(3.6, "USD"), 3.6);
  });

  it("sums mixed-currency order rows in USD", () => {
    const total = sumCommerceUsd([
      { total_amount: 4500, currency: "RWF" },
      { total_amount: 10, currency: "USD" },
    ]);
    assert.equal(total, 13.6);
  });
});
