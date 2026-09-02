import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatFollowerCount,
  formatFollowersLabel,
  storefrontFollowerCount,
  storefrontLogoSrc,
} from "./store-display";

describe("storefront follower display", () => {
  it("uses the social-proof baseline without inventing follow rows", () => {
    assert.equal(
      storefrontFollowerCount({ follower_count: 0, display_follower_count: 1300 }),
      1300,
    );
    assert.equal(
      storefrontFollowerCount({ follower_count: 1400, display_follower_count: 1300 }),
      1400,
    );
    assert.equal(formatFollowerCount(1300), "1.3K");
    assert.equal(formatFollowersLabel(1300), "1.3K Followers");
  });

  it("uses the official Jimvio mark for Jimvio Store when no logo is uploaded", () => {
    assert.equal(
      storefrontLogoSrc({ business_slug: "jimvio-store", business_logo: null }),
      "/jimvio-logo-mark.png",
    );
    assert.equal(
      storefrontLogoSrc({ business_slug: "other-shop", business_logo: null }),
      null,
    );
  });
});
