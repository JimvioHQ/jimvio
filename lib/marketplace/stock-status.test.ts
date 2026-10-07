import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_LOW_STOCK_THRESHOLD,
  isDropshipEligible,
  isPurchaseBlockedByStock,
  resolveStockStatus,
  shouldHideStockQuantity,
} from "./stock-status";

describe("stock status", () => {
  it("uses the platform default low-stock threshold", () => {
    assert.equal(DEFAULT_LOW_STOCK_THRESHOLD, 5);
  });

  it("resolves in-stock with available quantity", () => {
    const stock = resolveStockStatus({
      inventory_quantity: 128,
      track_inventory: true,
      low_stock_threshold: 5,
    });
    assert.equal(stock.status, "in_stock");
    assert.equal(stock.available, 128);
    assert.match(stock.label, /In stock/);
    assert.match(stock.label, /128/);
  });

  it("resolves low stock from threshold", () => {
    const stock = resolveStockStatus({
      inventory_quantity: 4,
      track_inventory: true,
      low_stock_threshold: 5,
    });
    assert.equal(stock.status, "low_stock");
    assert.match(stock.label, /Low stock/);
    assert.match(stock.label, /4 left/);
  });

  it("resolves out of stock and blocks purchase", () => {
    const input = {
      inventory_quantity: 0,
      track_inventory: true,
    };
    const stock = resolveStockStatus(input);
    assert.equal(stock.status, "out_of_stock");
    assert.equal(stock.label, "Out of stock");
    assert.equal(isPurchaseBlockedByStock(input), true);
  });

  it("uses selected-variant quantity, not a product total", () => {
    const black40 = resolveStockStatus({
      inventory_quantity: 3,
      track_inventory: true,
      low_stock_threshold: 5,
    });
    assert.equal(black40.status, "low_stock");
    assert.equal(black40.available, 3);
  });

  it("hides quantity for CJ catalogs while still reporting status", () => {
    assert.equal(shouldHideStockQuantity({ source: "cj" }), true);
    const stock = resolveStockStatus({
      inventory_quantity: 40,
      track_inventory: true,
      hideQuantity: true,
    });
    assert.equal(stock.status, "in_stock");
    assert.equal(stock.label, "In stock");
    assert.equal(stock.showQuantity, false);
  });

  it("marks CJ products as dropship eligible only", () => {
    assert.equal(isDropshipEligible({ source: "cj" }), true);
    assert.equal(isDropshipEligible({ source: "vendor" }), false);
  });
});
