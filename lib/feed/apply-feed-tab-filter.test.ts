import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyFeedTabFilter,
  diversifyAuthors,
  matchesFeedTabFilter,
  sortRisingByVelocity,
} from "./apply-feed-tab-filter.ts";
import { rankGlobalFeedItems } from "./global-feed-ranking.ts";

const NOW = Date.parse("2026-09-20T12:00:00.000Z");

function post(partial: {
  id: string;
  author_id?: string;
  community_id?: string;
  created_at?: string;
  like_count?: number;
  comment_count?: number;
  hoursAgo?: number;
}) {
  const hoursAgo = partial.hoursAgo ?? 1;
  return {
    id: partial.id,
    author_id: partial.author_id ?? "a1",
    community_id: partial.community_id ?? "c1",
    created_at: new Date(NOW - hoursAgo * 3_600_000).toISOString(),
    like_count: partial.like_count ?? 0,
    comment_count: partial.comment_count ?? 0,
    body: `real post ${partial.id}`,
  };
}

describe("applyFeedTabFilter", () => {
  it("keeps for-you / recommended / newest unfiltered by age", () => {
    const posts = [post({ id: "old", hoursAgo: 1000, like_count: 0 })];
    assert.equal(applyFeedTabFilter(posts, "for-you", NOW).length, 1);
    assert.equal(applyFeedTabFilter(posts, "recommended", NOW).length, 1);
    assert.equal(applyFeedTabFilter(posts, "newest", NOW).length, 1);
  });

  it("hot requires recent + real engagement", () => {
    const engaged = post({ id: "hot", hoursAgo: 12, like_count: 1 });
    const quiet = post({ id: "quiet", hoursAgo: 12, like_count: 0 });
    const old = post({ id: "old", hoursAgo: 100, like_count: 5 });
    assert.equal(matchesFeedTabFilter(engaged, "hot", NOW), true);
    assert.equal(matchesFeedTabFilter(quiet, "hot", NOW), false);
    assert.equal(matchesFeedTabFilter(old, "hot", NOW), false);
  });

  it("trending allows 14d with engagement; rising allows 7d without", () => {
    const risingQuiet = post({ id: "r", hoursAgo: 24 * 3, like_count: 0 });
    const trendingQuiet = post({ id: "t", hoursAgo: 24 * 3, like_count: 0 });
    assert.equal(matchesFeedTabFilter(risingQuiet, "rising", NOW), true);
    assert.equal(matchesFeedTabFilter(trendingQuiet, "trending", NOW), false);
  });

  it("does not invent engagement when filtering", () => {
    const filtered = applyFeedTabFilter(
      [post({ id: "a", hoursAgo: 1, like_count: 0, comment_count: 0 })],
      "hot",
      NOW,
    );
    assert.equal(filtered.length, 0);
  });
});

describe("sortRisingByVelocity", () => {
  it("orders by real engagement / age", () => {
    const slow = post({ id: "slow", hoursAgo: 20, like_count: 2 });
    const fast = post({ id: "fast", hoursAgo: 2, like_count: 2 });
    const ordered = sortRisingByVelocity([slow, fast], NOW);
    assert.equal(ordered[0]?.id, "fast");
  });
});

describe("diversifyAuthors", () => {
  it("avoids consecutive same-author when alternatives exist", () => {
    const posts = [
      post({ id: "1", author_id: "a" }),
      post({ id: "2", author_id: "a" }),
      post({ id: "3", author_id: "b" }),
    ];
    const out = diversifyAuthors(posts);
    assert.equal(out.length, 3);
    assert.notEqual(out[0]?.author_id, out[1]?.author_id);
  });

  it("never drops legitimate posts", () => {
    const posts = [
      post({ id: "1", author_id: "a" }),
      post({ id: "2", author_id: "a" }),
    ];
    assert.equal(diversifyAuthors(posts).length, 2);
  });
});

describe("rankGlobalFeedItems rotation", () => {
  it("changes head ordering across buckets without fabricating posts", () => {
    const items = Array.from({ length: 20 }, (_, i) =>
      post({
        id: `p${i}`,
        author_id: `u${i % 7}`,
        community_id: `c${i % 5}`,
        like_count: 20 - (i % 8),
        comment_count: i % 3,
        hoursAgo: i + 1,
      }),
    );
    const a = rankGlobalFeedItems(items, {
      viewerId: "viewer",
      followedAuthorIds: new Set(),
      now: NOW,
      bucket: 111,
    });
    const b = rankGlobalFeedItems(items, {
      viewerId: "viewer",
      followedAuthorIds: new Set(),
      now: NOW,
      bucket: 999_001,
    });
    assert.equal(a.length, items.length);
    assert.equal(b.length, items.length);
    assert.deepEqual(
      new Set(a.map((p) => p.id)),
      new Set(items.map((p) => p.id)),
    );
    // Different seeds should usually reshuffle the quality head.
    const headA = a.slice(0, 5).map((p) => p.id).join(",");
    const headB = b.slice(0, 5).map((p) => p.id).join(",");
    assert.notEqual(headA, headB);
  });
});
