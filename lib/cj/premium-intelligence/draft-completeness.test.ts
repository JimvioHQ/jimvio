import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isCompleteCjDraft } from "@/lib/cj/premium-intelligence/draft-completeness";

const img = (n: number) => Array.from({ length: n }, (_, i) => `https://cf.cjdropshipping.com/${i}.jpg`);
const desc = "<p>Portable 10000mAh power bank with USB-C fast charging and LED display.</p>";

describe("CJ draft completeness (detail refetch decision)", () => {
  it("a list-only draft (1 image, no description, no CJ variants) is incomplete", () => {
    assert.equal(isCompleteCjDraft({ images: img(1), description: null, cjVariantCount: 0 }), false);
  });
  it("each missing piece forces a detail refetch", () => {
    assert.equal(isCompleteCjDraft({ images: img(2), description: desc, cjVariantCount: 2 }), false);
    assert.equal(isCompleteCjDraft({ images: img(5), description: "<p>Short</p>", cjVariantCount: 2 }), false);
    assert.equal(isCompleteCjDraft({ images: img(5), description: desc, cjVariantCount: 0 }), false);
  });
  it("a complete draft is reused", () => {
    assert.equal(isCompleteCjDraft({ images: img(5), description: desc, cjVariantCount: 3 }), true);
  });
});
