import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  findVariantForSelectedOptions,
  getPurchasableOptionAxes,
  isOptionValueAvailable,
  requiresPurchasableVariantSelection,
} from "./storefront-variants";

const phoneVariants = [
  {
    id: "a",
    is_active: true,
    inventory_quantity: 10,
    options: { Color: "Cool Black", "Applicable Model": "SM S23" },
  },
  {
    id: "b",
    is_active: true,
    inventory_quantity: 8,
    options: { Color: "Cool Black", "Applicable Model": "SM S23Ultra" },
  },
  {
    id: "c",
    is_active: true,
    inventory_quantity: 5,
    options: { Color: "Dream Purple", "Applicable Model": "SM S23" },
  },
];

describe("storefront variant option axes", () => {
  it("requires selection for multi-color / multi-model products", () => {
    assert.equal(requiresPurchasableVariantSelection(phoneVariants), true);
  });

  it("exposes Color and Applicable Model axes", () => {
    const axes = getPurchasableOptionAxes(phoneVariants);
    assert.deepEqual(
      axes.map((a) => a.key).sort(),
      ["Applicable Model", "Color"]
    );
    const color = axes.find((a) => a.key === "Color");
    assert.ok(color);
    assert.deepEqual(color!.values.sort(), ["Cool Black", "Dream Purple"]);
  });

  it("resolves the unique variant for a full option selection", () => {
    const match = findVariantForSelectedOptions(phoneVariants, {
      Color: "Cool Black",
      "Applicable Model": "SM S23Ultra",
    });
    assert.equal(match?.id, "b");
  });

  it("returns null for incomplete selections", () => {
    assert.equal(
      findVariantForSelectedOptions(phoneVariants, { Color: "Cool Black" }),
      null
    );
  });

  it("disables incompatible model values for the selected color", () => {
    assert.equal(
      isOptionValueAvailable(
        phoneVariants,
        "Applicable Model",
        "SM S23Ultra",
        { Color: "Dream Purple" },
        false
      ),
      false
    );
    assert.equal(
      isOptionValueAvailable(
        phoneVariants,
        "Applicable Model",
        "SM S23",
        { Color: "Dream Purple" },
        false
      ),
      true
    );
  });

  it("does not require selection for a single SKU", () => {
    assert.equal(
      requiresPurchasableVariantSelection([phoneVariants[0]!]),
      false
    );
  });
});
