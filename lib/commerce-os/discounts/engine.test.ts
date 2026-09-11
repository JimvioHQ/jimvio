import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyStoreDiscount, estimateTax } from "./engine";
import { reorderSections } from "../themes/registry";
import { slugifyHandle } from "../tenant";

describe("store discounts", () => {
  const base = {
    id: "d1",
    code: "SAVE10",
    discount_type: "percent" as const,
    value: 10,
    applies_to: "order" as const,
    min_order_amount: null,
    usage_limit: null,
    used_count: 0,
    starts_at: null,
    ends_at: null,
    is_active: true,
    is_automatic: false,
  };

  it("applies percent discount without going negative", () => {
    const r = applyStoreDiscount(base, 100, 5);
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.discountAmount, 10);
  });

  it("rejects expired discounts", () => {
    const r = applyStoreDiscount(
      { ...base, ends_at: new Date(Date.now() - 1000).toISOString() },
      100
    );
    assert.equal(r.ok, false);
  });

  it("supports free shipping", () => {
    const r = applyStoreDiscount(
      { ...base, discount_type: "free_shipping", value: 0 },
      50,
      9
    );
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.freeShipping, true);
  });
});

describe("tax estimate", () => {
  it("computes exclusive tax", () => {
    const r = estimateTax({ subtotal: 100, ratePercent: 10, inclusive: false });
    assert.equal(r.taxAmount, 10);
  });
});

describe("handles and theme sections", () => {
  it("slugifies store handles", () => {
    assert.equal(slugifyHandle("My Cool Store!"), "my-cool-store");
  });

  it("reorders sections", () => {
    const sections = [
      { id: "a", type: "hero" as const, enabled: true },
      { id: "b", type: "footer" as const, enabled: true },
    ];
    const next = reorderSections(sections, 0, 1);
    assert.equal(next[0]?.id, "b");
    assert.equal(next[1]?.id, "a");
  });
});
