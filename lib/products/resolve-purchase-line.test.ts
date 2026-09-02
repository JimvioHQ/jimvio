import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolvePurchaseLine } from "./resolve-purchase-line";

const cjProduct = {
  id: "11111111-1111-4111-8111-111111111111",
  price: 5000,
  source: "cj",
  source_metadata: { cj_pid: "pid-1" },
  track_inventory: true,
  inventory_quantity: 10,
};

describe("resolvePurchaseLine", () => {
  it("uses the only SKU when the product has no selectable options", () => {
    const resolved = resolvePurchaseLine({
      product: cjProduct,
      variants: [
        {
          id: "22222222-2222-4222-8222-222222222222",
          cj_vid: "VID1",
          cj_pid: "pid-1",
          price: 5100,
          inventory_quantity: 8,
          is_active: true,
          options: { sku: "SKU1" },
        },
      ],
    });
    assert.equal(resolved.ok, true);
    if (!resolved.ok) return;
    assert.equal(resolved.pendingVariantSelection, false);
    assert.equal(resolved.variantId, "22222222-2222-4222-8222-222222222222");
    assert.equal(resolved.cjVid, "VID1");
    assert.equal(resolved.price, 5100);
  });

  it("requires a selection when multiple purchasable options exist", () => {
    const variants = [
      {
        id: "33333333-3333-4333-8333-333333333333",
        cj_vid: "VID-RED",
        price: 5000,
        inventory_quantity: 4,
        is_active: true,
        options: { color: "Red" },
      },
      {
        id: "44444444-4444-4444-8444-444444444444",
        cj_vid: "VID-BLUE",
        price: 5200,
        inventory_quantity: 3,
        is_active: true,
        options: { color: "Blue" },
      },
    ];
    const missing = resolvePurchaseLine({
      product: cjProduct,
      variants,
    });
    assert.equal(missing.ok, false);
    if (missing.ok) return;
    assert.match(missing.error, /select your options/i);

    const selected = resolvePurchaseLine({
      product: cjProduct,
      variants,
      selectedVariantId: "44444444-4444-4444-8444-444444444444",
    });
    assert.equal(selected.ok, true);
    if (!selected.ok) return;
    assert.equal(selected.cjVid, "VID-BLUE");
    assert.equal(selected.variantId, "44444444-4444-4444-8444-444444444444");
  });

  it("rejects CJ products that have no real supplier vid", () => {
    const resolved = resolvePurchaseLine({
      product: { ...cjProduct, source_metadata: { cj_pid: "pid-1" } },
      variants: [],
    });
    assert.equal(resolved.ok, false);
    if (resolved.ok) return;
    assert.match(resolved.error, /supplier SKU/i);
  });

  it("uses product-level cj_vid for a single-SKU CJ product with no variant rows", () => {
    const resolved = resolvePurchaseLine({
      product: {
        ...cjProduct,
        source_metadata: { cj_pid: "pid-1", cj_vid: "VID-DEFAULT" },
      },
      variants: [],
    });
    assert.equal(resolved.ok, true);
    if (!resolved.ok) return;
    assert.equal(resolved.cjVid, "VID-DEFAULT");
    assert.equal(resolved.variantId, null);
  });

  it("resolves a single out-of-stock SKU so inventory can fail clearly", () => {
    const resolved = resolvePurchaseLine({
      product: { ...cjProduct, inventory_quantity: 50 },
      variants: [
        {
          id: "55555555-5555-4555-8555-555555555555",
          cj_vid: "VID-OOS",
          price: 5000,
          inventory_quantity: 0,
          is_active: true,
          options: { sku: "SKU1" },
        },
      ],
    });
    assert.equal(resolved.ok, true);
    if (!resolved.ok) return;
    assert.equal(resolved.cjVid, "VID-OOS");
    assert.equal(resolved.inventoryQty, 0);
  });
});
