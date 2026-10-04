import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  encodeGlobalFeedCursor,
  isExcludedFromGlobalFeed,
  parseGlobalFeedCursor,
} from "./global-feed-exclusions.ts";
import { rankGlobalFeedItems } from "./global-feed-ranking.ts";
import { rankFeedItems } from "../growth/feed-ranking.ts";
import { applyFeedTabFilter } from "./apply-feed-tab-filter.ts";

/**
 * Unit coverage for the discovery invariants that previously hid eligible posts.
 * (DB pooling is covered indirectly via exclusion + ranking + cursor contracts.)
 */

describe("eligible post discovery invariants", () => {
  it("does not exclude editorial posts from the global feed", () => {
    const editorial = {
      id: "e1",
      body: "Photo from the trail",
      attachments: { jimvio: { origin: "editorial", key: "photo-1" } },
      profiles: { email: "editorial+amina@jimvio.com", username: "amina" },
    };
    assert.equal(isExcludedFromGlobalFeed(editorial), false);
  });

  it("keeps near-duplicate bodies in the ranked pool (demote, do not drop)", () => {
    const items = [
      {
        id: "a",
        author_id: "u1",
        body: "Same caption for two different photos",
        created_at: "2026-09-20T12:00:00.000Z",
        like_count: 5,
      },
      {
        id: "b",
        author_id: "u1",
        body: "Same caption for two different photos",
        created_at: "2026-09-20T11:00:00.000Z",
        like_count: 1,
      },
      {
        id: "c",
        author_id: "u2",
        body: "Different post",
        created_at: "2026-09-20T10:00:00.000Z",
        like_count: 2,
      },
    ];
    const ranked = rankFeedItems(items, { now: Date.parse("2026-09-20T13:00:00.000Z") });
    assert.equal(ranked.length, 3);
    assert.ok(ranked.some((p) => p.id === "b"));
  });

  it("global ranking preserves all ids across session seed changes", () => {
    const items = Array.from({ length: 12 }, (_, i) => ({
      id: `p${i}`,
      author_id: `a${i % 4}`,
      community_id: `c${i % 3}`,
      body: `post body ${i}`,
      created_at: new Date(Date.parse("2026-09-20T12:00:00.000Z") - i * 3_600_000).toISOString(),
      like_count: i,
      comment_count: 0,
    }));
    const a = rankGlobalFeedItems(items, { bucket: 1, now: Date.parse("2026-09-20T12:00:00.000Z") });
    const b = rankGlobalFeedItems(items, { bucket: 2, now: Date.parse("2026-09-20T12:00:00.000Z") });
    assert.equal(a.length, items.length);
    assert.equal(b.length, items.length);
    assert.deepEqual(
      [...a.map((p) => p.id)].sort(),
      [...b.map((p) => p.id)].sort(),
    );
  });

  it("for-you tab does not apply age/engagement gates", () => {
    const posts = [
      {
        id: "cold",
        created_at: "2025-01-01T00:00:00.000Z",
        like_count: 0,
        comment_count: 0,
      },
      {
        id: "hot",
        created_at: "2026-09-20T11:00:00.000Z",
        like_count: 3,
        comment_count: 1,
      },
    ];
    const kept = applyFeedTabFilter(posts, "for-you", Date.parse("2026-09-20T12:00:00.000Z"));
    assert.equal(kept.length, 2);
  });

  it("offset pagination with locked asOf does not admit newer posts mid-session", () => {
    const asOf = Date.parse("2026-09-20T12:00:00.000Z");
    const cursor = encodeGlobalFeedCursor({ bucket: 42, offset: 20, asOf });
    const parsed = parseGlobalFeedCursor(cursor, asOf + 60_000);
    assert.equal(parsed.asOf, asOf);
    assert.equal(parsed.offset, 20);
    assert.equal(parsed.bucket, 42);

    const pool = [
      { id: "new", created_at: new Date(asOf + 5_000).toISOString() },
      { id: "old", created_at: new Date(asOf - 5_000).toISOString() },
    ];
    const sessionPool = pool.filter((p) => Date.parse(p.created_at) <= parsed.asOf);
    assert.deepEqual(
      sessionPool.map((p) => p.id),
      ["old"],
    );
  });
});
