import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { feedScore } from "@/lib/growth/feed-ranking.ts";
import {
  communityLocationBoost,
  rankWithBoundedLocationBoost,
} from "./discovery-rank.ts";
import {
  rankMarketplacePool,
  shippingClaim,
  shippingCoverageForProduct,
  shouldLocationRankMarketplace,
} from "./marketplace-rank.ts";

describe("marketplace location ranking", () => {
  it("puts a shippable product ahead of a more viewed product that cannot ship", () => {
    const ranked = rankMarketplacePool(
      [
        {
          id: "far",
          view_count: 500,
          is_digital: false,
          product_type: "physical",
          vendors: { business_country: "CN" },
        },
        {
          id: "local",
          view_count: 40,
          is_digital: false,
          product_type: "physical",
          vendors: { business_country: "KE" },
        },
      ],
      "KE",
      [
        { product_id: "far", ship_to_country: "US", min_delivery_days: 3, is_active: true },
        { product_id: "local", ship_to_country: "KE", min_delivery_days: 6, is_active: true },
      ],
    );
    assert.deepEqual(ranked.map((row) => row.id), ["local", "far"]);
    assert.equal(shippingClaim("unknown"), null);
    assert.equal(shippingClaim("unavailable"), null);
    assert.match(shippingClaim("country") ?? "", /includes this destination/);
  });

  it("prefers a shorter listed estimate and a domestic seller without inventing days", () => {
    const ranked = rankMarketplacePool(
      [
        { id: "slow", view_count: 80, vendors: { business_country: "US" } },
        { id: "fast-foreign", view_count: 10, vendors: { business_country: "CN" } },
        { id: "fast-domestic", view_count: 10, vendors: { business_country: "KE" } },
        { id: "unknown", view_count: 200, is_digital: false, product_type: "physical" },
      ],
      "KE",
      [
        { product_id: "slow", ship_to_country: "KE", min_delivery_days: 20, is_active: true },
        { product_id: "fast-foreign", ship_to_country: "KE", min_delivery_days: 4, is_active: true },
        { product_id: "fast-domestic", ship_to_country: "KE", min_delivery_days: 4, is_active: true },
      ],
    );
    assert.deepEqual(
      ranked.map((row) => row.id),
      ["fast-domestic", "fast-foreign", "slow", "unknown"],
    );
    assert.equal(
      shippingCoverageForProduct(
        [{ product_id: "unknown", ship_to_country: "KE", min_delivery_days: null, is_active: true }],
        "KE",
      ).minDeliveryDays,
      null,
    );
  });

  it("ranks an explicit destination ahead of a global option and leaves missing shipping unknown", () => {
    const ranked = rankMarketplacePool(
      [
        { id: "elsewhere", view_count: 900, is_digital: false, product_type: "physical" },
        { id: "global", view_count: 50, is_digital: false, product_type: "physical" },
        { id: "country", view_count: 5, is_digital: false, product_type: "physical" },
        { id: "missing", view_count: 800, is_digital: false, product_type: "physical" },
      ],
      "KE",
      [
        { product_id: "elsewhere", ship_to_country: "US", min_delivery_days: 2, is_active: true },
        { product_id: "global", ship_to_country: "*", min_delivery_days: 3, is_active: true },
        { product_id: "country", ship_to_country: "KE", min_delivery_days: 9, is_active: true },
      ],
    );
    assert.deepEqual(
      ranked.map((row) => row.id),
      ["country", "global", "missing", "elsewhere"],
    );
    assert.equal(shippingCoverageForProduct([], "KE").coverage, "unknown");
    assert.match(shippingClaim("global") ?? "", /estimate/i);
    assert.doesNotMatch(shippingClaim("global") ?? "", /guaranteed/i);
  });

  it("keeps digital products and the original order when the country is unknown", () => {
    const products = [
      { id: "b", view_count: 1, is_digital: true, product_type: "digital" },
      { id: "a", view_count: 9, is_digital: false, product_type: "physical" },
    ];
    assert.equal(rankMarketplacePool(products, null, []), products);
    assert.equal(
      shouldLocationRankMarketplace({ sort: "newest", country: "KE", offset: 0, limit: 24 }),
      false,
    );
    assert.equal(
      shouldLocationRankMarketplace({ sort: "trending", country: null, offset: 0, limit: 24 }),
      false,
    );
    assert.equal(
      shouldLocationRankMarketplace({
        sort: "trending",
        country: "KE",
        offset: 24,
        limit: 24,
        affiliate: true,
      }),
      false,
    );
  });
});

describe("community and post location ranking", () => {
  it("nudges a close local community without beating a much larger global one", () => {
    const rows = [
      { id: "global", region: "United States", member_count: 100 },
      { id: "local", region: "Nairobi, Kenya", member_count: 96 },
      { id: "huge", region: null, member_count: 400 },
    ];
    const ranked = rankWithBoundedLocationBoost(rows, "KE", (row) => row.member_count);
    assert.equal(ranked[0]?.id, "huge");
    assert.equal(ranked[1]?.id, "local");
    assert.equal(communityLocationBoost("Find posts about shoes", "KE"), 0);
  });

  it("leaves order unchanged when the viewer country is unknown", () => {
    const rows = [
      { id: "b", region: "Kenya" },
      { id: "a", region: "Kenya" },
    ];
    assert.equal(rankWithBoundedLocationBoost(rows, null, () => 1), rows);
  });

  it("adds a capped post boost and does not drop other posts", () => {
    const created = "2026-04-01T00:00:00.000Z";
    const local = feedScore(
      {
        id: "local",
        created_at: created,
        like_count: 2,
        community_region: "RW",
      },
      { now: Date.parse(created), viewerCountry: "RW" },
    );
    const sameWithoutCountry = feedScore(
      {
        id: "local",
        created_at: created,
        like_count: 2,
        community_region: "RW",
      },
      { now: Date.parse(created) },
    );
    assert.ok(Math.abs(local - sameWithoutCountry - 8) < 0.001);

    const globalViral = feedScore(
      {
        id: "viral",
        created_at: created,
        like_count: 500,
        comment_count: 80,
        community_region: "US",
      },
      { now: Date.parse(created), viewerCountry: "RW" },
    );
    assert.ok(globalViral > local);
  });
});
