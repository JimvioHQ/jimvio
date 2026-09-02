import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  catalogOptionKeys,
  catalogVariantRecords,
  catalogVariantStock,
  toCjVariantFromCatalog,
} from "./catalog-variants";

const payload = {
  productKeyEnSet: ["style", "capacity"],
  variants: [
    {
      vid: "V123",
      variantSku: "",
      variantKey: "White-500ml",
      variantSellPrice: "4.20",
      inventories: [{ totalInventory: 12 }, { factoryInventory: 3 }],
    },
  ],
};

describe("catalog variants", () => {
  it("parses option keys and stock from the catalog payload", () => {
    assert.deepEqual(catalogOptionKeys(payload), ["style", "capacity"]);
    const records = catalogVariantRecords(payload);
    assert.equal(records.length, 1);
    assert.equal(catalogVariantStock(records[0]!), 15);
  });

  it("maps a catalog row to a CJ variant with a real vid, never a placeholder", () => {
    const mapped = toCjVariantFromCatalog("PID1", "SKU1", payload.variants[0]!);
    assert.ok(mapped);
    assert.equal(mapped?.vid, "V123");
    assert.equal(mapped?.variantSku, "V123");
    assert.equal(mapped?.pid, "PID1");
  });

  it("skips placeholder variantProperty and uses variantKey", () => {
    const mapped = toCjVariantFromCatalog("PID1", "SKU1", {
      vid: "V999",
      variantProperty: "[]",
      variantKey: "Grey-S",
      variantSku: "SKU-GREY-S",
    });
    assert.equal(mapped?.variantProperty, "Grey-S");
    assert.equal(mapped?.variantSku, "SKU-GREY-S");
  });
});
