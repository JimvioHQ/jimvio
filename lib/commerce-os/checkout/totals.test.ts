import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeOrderTotalAmount, roundMoney } from "../../commerce/order-totals.ts";
import { applyStoreDiscount, estimateTax } from "../discounts/engine.ts";

describe("checkout money totals", () => {
  it("computes product only", () => {
    assert.equal(
      computeOrderTotalAmount({
        subtotal: 100,
        discount_amount: 0,
        shipping_amount: 0,
        tax_amount: 0,
      }),
      100
    );
  });

  it("applies percent discount without going negative", () => {
    const d = applyStoreDiscount(
      {
        id: "1",
        code: "SAVE10",
        discount_type: "percent",
        value: 10,
        applies_to: "order",
        min_order_amount: null,
        usage_limit: null,
        used_count: 0,
        starts_at: null,
        ends_at: null,
        is_active: true,
        is_automatic: false,
      },
      100,
      5
    );
    assert.equal(d.ok, true);
    if (d.ok) {
      assert.equal(
        computeOrderTotalAmount({
          subtotal: 100,
          discount_amount: d.discountAmount,
          shipping_amount: 5,
          tax_amount: 0,
        }),
        95
      );
    }
  });

  it("product + shipping + tax exclusive", () => {
    const tax = estimateTax({ subtotal: 100, ratePercent: 10, inclusive: false });
    assert.equal(tax.taxAmount, 10);
    assert.equal(
      computeOrderTotalAmount({
        subtotal: 100,
        discount_amount: 0,
        shipping_amount: 9.99,
        tax_amount: tax.taxAmount,
      }),
      119.99
    );
  });

  it("product + discount + shipping + tax", () => {
    const tax = estimateTax({ subtotal: 90, ratePercent: 5, inclusive: false });
    assert.equal(
      roundMoney(
        computeOrderTotalAmount({
          subtotal: 100,
          discount_amount: 10,
          shipping_amount: 6,
          tax_amount: tax.taxAmount,
        })
      ),
      100.5
    );
  });

  it("multiple quantity equivalent subtotal", () => {
    assert.equal(
      computeOrderTotalAmount({
        subtotal: 49.99 * 3,
        discount_amount: 0,
        shipping_amount: 0,
        tax_amount: 0,
      }),
      roundMoney(149.97)
    );
  });

  it("never returns negative total", () => {
    assert.equal(
      computeOrderTotalAmount({
        subtotal: 10,
        discount_amount: 50,
        shipping_amount: 0,
        tax_amount: 0,
      }),
      0
    );
  });
});
