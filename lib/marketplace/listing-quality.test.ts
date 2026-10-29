import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { listingQuality } from "./listing-quality.ts";

const full = {
  name: "Stainless steel water bottle 750ml",
  description: "x".repeat(260),
  images: ["a", "b", "c"],
  price: 12,
  category_id: "c1",
  product_type: "physical",
  product_shipping_options: [{ is_active: true }],
  vendors: { verification_status: "verified" },
};

describe("listing quality score", () => {
  it("is 100 for a complete listing and the checks add up", () => {
    const q = listingQuality(full);
    assert.equal(q.score, 100);
    assert.equal(q.level, "excellent");
    assert.equal(q.checks.reduce((s, c) => s + c.points, 0), 100);
  });

  it("explains each missing piece", () => {
    const q = listingQuality({ ...full, images: [], description: "", vendors: null, product_shipping_options: [] });
    assert.equal(q.score, 35);
    assert.equal(q.level, "needs-work");
    assert.deepEqual(
      q.checks.filter((c) => c.earned === 0).map((c) => c.id),
      ["description", "photos", "delivery", "seller"],
    );
  });

  it("marks supplier keywords in the title", () => {
    const q = listingQuality({ ...full, name: "Hot Selling water bottle 750ml" });
    assert.equal(q.checks.find((c) => c.id === "title")?.earned, 0);
  });

  it("uses Jimvio's file check for digital listings", () => {
    const pending = listingQuality({ ...full, product_type: "digital", product_shipping_options: [] });
    const approved = listingQuality({ ...full, product_type: "digital", digital_verification_state: "approved" });
    assert.equal(pending.checks.find((c) => c.id === "delivery")?.earned, 0);
    assert.equal(approved.checks.find((c) => c.id === "delivery")?.earned, 15);
  });

  it("counts live supplier shipping quotes", () => {
    const q = listingQuality({ ...full, product_shipping_options: [], source: "cj" });
    assert.equal(q.checks.find((c) => c.id === "delivery")?.earned, 15);
  });
});
