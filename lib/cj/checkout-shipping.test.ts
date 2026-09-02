import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { usableCjVid } from "./variant-vid";
import { toCheckoutFreightProducts } from "./checkout-shipping";

describe("checkout freight vids", () => {
  it("keeps a real CJ vid and drops empty values", () => {
    const products = toCheckoutFreightProducts([
      { vid: "2410080916471625800", quantity: 1, weight: 120 },
      { vid: "  ", quantity: 1 },
      { vid: null, quantity: 2 },
    ]);
    assert.equal(products.length, 1);
    assert.equal(products[0]?.vid, "2410080916471625800");
    assert.equal(products[0]?.weight, 120);
  });

  it("does not invent a default weight", () => {
    const products = toCheckoutFreightProducts([{ vid: "V1", quantity: 1 }]);
    assert.equal(products[0]?.weight, undefined);
  });

  it("accepts UUID-shaped CJ vids that came from the cj_vid column", () => {
    assert.equal(usableCjVid("F3DB702E-6A68-4C55-B8AE-6A8A42EB41C3"), "F3DB702E-6A68-4C55-B8AE-6A8A42EB41C3");
  });
});
