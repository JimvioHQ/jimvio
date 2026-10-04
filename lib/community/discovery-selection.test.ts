import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  discoveryRankScore,
  selectDiscoveryCommunities,
} from "./discovery-selection.ts";

describe("selectDiscoveryCommunities", () => {
  it("pins p7provider and includes a paid community when available", () => {
    const rows = [
      {
        id: "1",
        name: "Social Media Managers",
        slug: "social-media-managers",
        member_count: 842,
        is_featured: false,
        is_free: false,
        monthly_price: 27,
        avatar_url: "https://example.com/a.jpg",
        cover_image: "https://example.com/c.jpg",
        settings: { jimvio: { origin: "editorial" } },
      },
      {
        id: "2",
        name: "P7 PROVIDER",
        slug: "p7provider",
        member_count: 858,
        is_featured: true,
        is_free: true,
        monthly_price: 0,
        avatar_url: "https://example.com/p7.jpg",
        cover_image: null,
        settings: null,
      },
      {
        id: "3",
        name: "Africa Creators",
        slug: "africa-creators",
        member_count: 205,
        is_featured: true,
        is_free: true,
        avatar_url: "https://example.com/ac.jpg",
        cover_image: "https://example.com/ac-c.jpg",
        settings: { jimvio: { origin: "editorial" } },
      },
    ];

    const selected = selectDiscoveryCommunities(rows, 3);
    assert.equal(selected[0]?.slug, "p7provider");
    assert.ok(selected.some((r) => r.is_free === false));
    assert.equal(selected.length, 3);
  });

  it("scores priority slug above larger non-priority communities", () => {
    const p7 = discoveryRankScore({
      id: "a",
      name: "P7",
      slug: "p7provider",
      member_count: 10,
      is_featured: true,
      avatar_url: "x",
    });
    const big = discoveryRankScore({
      id: "b",
      name: "Big",
      slug: "big-hub",
      member_count: 900,
      is_featured: true,
      avatar_url: "y",
      cover_image: "z",
    });
    assert.ok(p7 > big);
  });
});
