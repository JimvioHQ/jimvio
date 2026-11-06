import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cleanProductSlug, uniqueProductSlug } from "@/lib/marketplace/product-slug";
import { cjSkuFromRouteSlug, productRouteLookups } from "@/lib/marketplace/product-route-lookup";

describe("clean product URLs", () => {
  it("has no supplier code and no catalog noise", () => {
    assert.equal(cleanProductSlug("Wholesale Hot Sale Camping Light 露营灯"), "camping-light");
    assert.equal(cleanProductSlug("Café Crème Mug"), "cafe-creme-mug");
    assert.ok(!/cj[a-z0-9]{5,}/.test(cleanProductSlug("Baby Teether Chain Silicone Nipple Bottle Lanyard")));
    assert.equal(cleanProductSlug(""), "product");
    assert.equal(cleanProductSlug("Men's Loose Pants"), "mens-loose-pants");
  });

  it("stays short and never ends on a cut word", () => {
    const slug = cleanProductSlug("new LOVE moon 3D night light Smart home table lamp Energy-saving LED lamp with remote control and timer function");
    assert.ok(slug.length <= 80, slug);
    assert.ok(!slug.endsWith("-"));
  });

  it("old supplier-code URLs still resolve by SKU (then the page redirects)", () => {
    assert.equal(cjSkuFromRouteSlug("whitehead-deep-cleansing-acne-mask-cjbjpfmb00711"), "CJBJPFMB00711");
    assert.deepEqual(productRouteLookups("whitehead-deep-cleansing-acne-mask-cjbjpfmb00711")[1], { kind: "sku", sku: "CJBJPFMB00711" });
  });

  it("picks the first free slug", async () => {
    const taken = new Set(["lamp", "lamp-2"]);
    const db = { from: () => ({ select: () => ({ eq: (_c: string, v: string) => ({ maybeSingle: async () => ({ data: taken.has(v) ? { id: "x" } : null }) }) }) }) };
    assert.equal(await uniqueProductSlug(db, "lamp"), "lamp-3");
  });
});

describe("legacy product URL detection", () => {
  it("matches only supplier-code product URLs", async () => {
    const { legacyProductSlug } = await import("@/lib/marketplace/legacy-product-redirect");
    assert.equal(legacyProductSlug("/marketplace/whitehead-deep-cleansing-acne-mask-cjbjpfmb00711"), "whitehead-deep-cleansing-acne-mask-cjbjpfmb00711");
    assert.equal(legacyProductSlug("/marketplace/CJBJPFMB00711"), "cjbjpfmb00711");
    assert.equal(legacyProductSlug("/marketplace/whitehead-deep-cleansing-acne-mask"), null);
    assert.equal(legacyProductSlug("/marketplace/physical"), null);
    assert.equal(legacyProductSlug("/marketplace/a/b-cjbjpfmb00711"), null);
  });
});
