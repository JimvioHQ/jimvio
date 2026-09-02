import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeHomepagePriorityScore, selectFlashDeals } from "./homepage-ranking";

describe("homepage ranking signals", () => {
  it("scores trending, verified, in-stock, and video products higher", () => {
    const base = {
      id: "a",
      status: "active",
      is_active: true,
      price: 10,
      inventory_quantity: 0,
    };
    const plain = computeHomepagePriorityScore(base, false);
    const strong = computeHomepagePriorityScore(
      {
        ...base,
        inventory_quantity: 20,
        source_metadata: { cj_trending: true, cj_supplier_verified: true },
      },
      true,
    );
    assert.ok(strong > plain);
  });

  it("keeps out-of-stock products out of flash deals when stock is known", () => {
    const selected = selectFlashDeals(
      [
        { id: "oos", status: "active", is_active: true, is_flash_deal: true, inventory_quantity: 0, price: 5 },
        { id: "ok", status: "active", is_active: true, is_flash_deal: true, inventory_quantity: 8, price: 5 },
      ],
      12,
    );
    assert.deepEqual(selected.map((p) => p.id), ["ok"]);
  });
});
