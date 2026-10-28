import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AFFILIATE_DISCLOSURE,
  AFFILIATE_DRAFT_LIMITATION,
  draftAffiliatePromotion,
} from "./promotion-draft";

describe("affiliate listing draft", () => {
  it("uses the supplied product facts and a disclosure", () => {
    const draft = draftAffiliatePromotion({
      name: "Gradient Phone Case",
      category: "Physical Products",
      description: "A magnetic case for everyday use.",
      price: 18.5,
      currency: "USD",
      commissionRate: 12,
    });
    assert.match(draft.tiktokCaption, /Gradient Phone Case/);
    assert.match(draft.instagramCaption, /USD 18\.50/);
    assert.match(draft.facebookPost, /12%/);
    assert.match(draft.emailCopy, /magnetic case/);
    assert.match(draft.xPost, new RegExp(AFFILIATE_DISCLOSURE.replace(/[.]/g, "\\.")));
    assert.ok(draft.xPost.length <= 240);
    assert.equal(draft.limitation, AFFILIATE_DRAFT_LIMITATION);
    assert.ok(draft.hashtags.includes("#ad"));
  });

  it("does not invent a link, a review, or a guarantee", () => {
    const draft = draftAffiliatePromotion({
      name: "Notebook",
      price: 0,
      commissionRate: 0,
    });
    const blob = JSON.stringify(draft);
    assert.match(blob, /Link Manager/);
    assert.doesNotMatch(blob, /https?:\/\//);
    assert.doesNotMatch(blob, /guaranteed|limited time|testimonial|best seller|only \d+ left/i);
    assert.doesNotMatch(draft.tiktokCaption, /Current commission rate/);
    assert.doesNotMatch(draft.tiktokCaption, /Listed price/);
  });
});
