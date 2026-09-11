import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  availableInventory,
  calculateSellingPrice,
  pickPriceRule,
  type PriceRuleRow,
} from "./engine";

describe("price engine", () => {
  it("applies percent markup to merchant cost", () => {
    const result = calculateSellingPrice({
      supplierCost: 10,
      markupType: "percent",
      markupValue: 40,
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.sellingPrice, 14);
      assert.equal(result.merchantCost, 10);
    }
  });

  it("applies fixed markup and min profit", () => {
    const result = calculateSellingPrice({
      supplierCost: 10,
      markupType: "fixed",
      markupValue: 1,
      minProfit: 5,
    });
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.sellingPrice, 15);
  });

  it("rejects negative costs", () => {
    const result = calculateSellingPrice({
      supplierCost: -1,
      markupType: "percent",
      markupValue: 10,
    });
    assert.equal(result.ok, false);
  });

  it("caps at max price", () => {
    const result = calculateSellingPrice({
      supplierCost: 10,
      markupType: "percent",
      markupValue: 100,
      maxPrice: 12,
    });
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.sellingPrice, 12);
  });
});

describe("availableInventory", () => {
  it("subtracts safety stock without going negative", () => {
    assert.equal(availableInventory(7, 2), 5);
    assert.equal(availableInventory(1, 5), 0);
  });
});

describe("pickPriceRule", () => {
  const rules: PriceRuleRow[] = [
    {
      id: "global",
      store_id: null,
      product_id: null,
      variant_id: null,
      markup_type: "percent",
      markup_value: 20,
      min_profit: null,
      max_price: null,
      rounding_rule: "none",
      currency: "USD",
      include_shipping: false,
      jimvio_margin_percent: 0,
      priority: 100,
      is_active: true,
    },
    {
      id: "product",
      store_id: null,
      product_id: "p1",
      variant_id: null,
      markup_type: "percent",
      markup_value: 50,
      min_profit: null,
      max_price: null,
      rounding_rule: "none",
      currency: "USD",
      include_shipping: false,
      jimvio_margin_percent: 0,
      priority: 50,
      is_active: true,
    },
  ];

  it("prefers product-specific over global", () => {
    const picked = pickPriceRule(rules, { productId: "p1" });
    assert.equal(picked?.id, "product");
  });
});
