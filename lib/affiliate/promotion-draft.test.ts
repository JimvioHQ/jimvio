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

  it("inserts only the affiliate's own Jimvio short link", () => {
    const tracked = "https://www.jimvio.com/ref/LNK-ABCDEF123456";
    const draft = draftAffiliatePromotion({
      name: "Notebook",
      price: 12,
      currency: "USD",
      commissionRate: 8,
      trackingUrl: tracked,
    });
    assert.match(draft.instagramCaption, new RegExp(tracked.replace(/[.]/g, "\\.")));
    assert.match(draft.scripts[0] ?? "", new RegExp(tracked.replace(/[.]/g, "\\.")));
    assert.match(draft.instagramCaption, new RegExp(AFFILIATE_DISCLOSURE.replace(/[.]/g, "\\.")));
    assert.ok(draft.xPost.includes(tracked) || !draft.xPost.includes("LNK-"));
    assert.ok(draft.xPost.length <= 240);
    const urls = JSON.stringify(draft).match(/https?:\/\/[^\s"\\]+/g) ?? [];
    assert.deepEqual([...new Set(urls.map((url) => url.replace(/[.,]$/, "")))], [tracked]);
  });

  it("drops a foreign, query, or partial tracking URL instead of inventing one", () => {
    for (const trackingUrl of [
      "https://evil.example/ref/LNK-ABCDEF123456",
      "https://www.jimvio.com/ref/LNK-ABCDEF123456?ref=other",
      "https://www.jimvio.com/marketplace/notebook",
      "javascript:alert(1)",
      "https://user:pass@www.jimvio.com/ref/LNK-ABCDEF123456",
    ]) {
      const draft = draftAffiliatePromotion({ name: "Notebook", trackingUrl });
      const blob = JSON.stringify(draft);
      assert.match(blob, /Link Manager/);
      assert.doesNotMatch(blob, /https?:\/\//);
      assert.match(blob, new RegExp(AFFILIATE_DISCLOSURE.replace(/[.]/g, "\\.")));
    }
  });

  it("keeps a long caption from cutting a tracked URL in half", () => {
    const tracked = "https://www.jimvio.com/ref/LNK-ABCDEF123456";
    const draft = draftAffiliatePromotion({
      name: "Notebook",
      description: "A".repeat(400),
      trackingUrl: tracked,
    });
    for (const field of [draft.tiktokCaption, draft.xPost, draft.instagramCaption]) {
      if (field.includes("LNK-")) assert.ok(field.includes(tracked));
      assert.doesNotMatch(field, /LNK-ABCDEF12345…|LNK-ABCDEF12345\./);
    }
    assert.match(draft.scripts[0] ?? "", new RegExp(tracked.replace(/[.]/g, "\\.")));
  });
});
