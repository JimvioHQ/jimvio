import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { cleanSupplierProductName } from "./clean-product-name";

describe("cleanSupplierProductName", () => {
  it("removes supplier jargon", () => {
    assert.equal(
      cleanSupplierProductName("European And American Stainless Steel Bracelet Female"),
      "Stainless Steel Bracelet Female",
    );
    assert.equal(
      cleanSupplierProductName("Flower  Single Shoes AliExpress Explosive Pumps"),
      "Flower Single Shoes Explosive Pumps",
    );
    assert.equal(
      cleanSupplierProductName("Ins Elegant Light Extravagant Love Heart Women's Necklace"),
      "Elegant Light Extravagant Love Heart Women's Necklace",
    );
  });

  it("does not touch words that only contain a jargon token", () => {
    assert.equal(cleanSupplierProductName("Insulated Water Bottle"), "Insulated Water Bottle");
    assert.equal(cleanSupplierProductName("Wishbone Pendant Necklace"), "Wishbone Pendant Necklace");
  });

  it("keeps the original when cleaning would leave almost nothing", () => {
    assert.equal(cleanSupplierProductName("Hot Selling Cup"), "Hot Selling Cup");
  });
});
