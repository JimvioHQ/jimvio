import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatFollowerCount,
  formatFollowersLabel,
  formatStoreRating,
  formatStoreSales,
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

  it("does not display 0.0 as a store rating", () => {
    const empty = formatStoreRating({ rating: 0, review_count: 0 });
    assert.equal(empty.hasRating, false);
    assert.equal(empty.label, "No ratings yet");

    const rated = formatStoreRating({ rating: 4.8, review_count: 1204 });
    assert.equal(rated.hasRating, true);
    assert.equal(rated.label, "4.8");
    assert.equal(rated.reviewLabel, "1,204 reviews");
  });

  it("formats real sales without inventing totals", () => {
    assert.equal(formatStoreSales(1074).label, "1,074");
    assert.equal(formatStoreSales(0).label, "0");
    assert.equal(formatStoreSales(null).count, 0);
  });
});
