import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isLikelyAutomatedClick,
  isRepeatReferralHit,
  safeAffiliateDestination,
} from "./tracking-guard";

const origin = "https://www.jimvio.com/ref/LNK-ABC";

describe("affiliate redirect safety", () => {
  it("keeps a product path and its query", () => {
    assert.equal(
      safeAffiliateDestination("/marketplace/widget?color=red", origin),
      "/marketplace/widget?color=red",
    );
  });

  it("keeps a same-site absolute URL as a path", () => {
    assert.equal(
      safeAffiliateDestination("https://www.jimvio.com/marketplace/widget", origin),
      "/marketplace/widget",
    );
  });

  it("rejects an external destination", () => {
    assert.equal(safeAffiliateDestination("https://evil.example/phish", origin), "/marketplace");
  });

  it("rejects a protocol-relative destination", () => {
    assert.equal(safeAffiliateDestination("//evil.example/phish", origin), "/marketplace");
  });

  it("rejects an invalid referral code as a destination", () => {
    assert.equal(safeAffiliateDestination("javascript:alert(1)", origin), "/marketplace");
  });
});

describe("affiliate click counting guards", () => {
  it("ignores link-preview crawlers and still allows a messaging-app browser", () => {
    assert.equal(isLikelyAutomatedClick("facebookexternalhit/1.1"), true);
    assert.equal(isLikelyAutomatedClick("Twitterbot/1.0"), true);
    assert.equal(
      isLikelyAutomatedClick(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 WhatsApp/2.23",
      ),
      false,
    );
  });

  it("does not count a refresh of the same referral", () => {
    assert.equal(isRepeatReferralHit("LNK-ABC", "LNK-ABC"), true);
    assert.equal(isRepeatReferralHit(null, "LNK-ABC"), false);
    assert.equal(isRepeatReferralHit("LNK-OLD", "LNK-ABC"), false);
  });
});
