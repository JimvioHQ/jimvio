import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  diversifyFeed,
  freshenHead,
  rankGlobalFeedItems,
} from "./global-feed-ranking.ts";
import { parseFeedAvoidIds, serializeFeedAvoidIds } from "./feed-session-head.ts";
import {
  encodeGlobalFeedCursor,
  getGlobalFeedRotationBucket,
  parseGlobalFeedCursor,
} from "./global-feed-exclusions.ts";

const NOW = Date.parse("2026-11-07T12:00:00.000Z");

function uuid(n: number): string {
  return `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
}

/** Mirrors production shape: one author dominates (9 of 18 posts). */
function realisticPool() {
  const authors = [
    ...Array(9).fill("p7"),
    ...Array(6).fill("spotlight"),
    "primefx",
    "member",
    "other",
  ];
  return authors.map((author, i) => ({
    id: uuid(i + 1),
    author_id: author,
    community_id: author === "member" ? "c-p7" : `c-${author}`,
    created_at: new Date(NOW - (i + 1) * 3_600_000 * 7).toISOString(),
    like_count: 2 + (i % 5),
    comment_count: i % 2,
    view_count: 5 + i,
    body: `Post ${i} body text`,
  }));
}

function maxSameAuthorRun(posts: { author_id?: string | null }[]): number {
  let best = 0;
  let run = 0;
  let prev: string | null | undefined;
  for (const p of posts) {
    run = p.author_id === prev ? run + 1 : 1;
    prev = p.author_id;
    best = Math.max(best, run);
  }
  return best;
}

function adjacentSameAuthor(posts: { author_id?: string | null }[]): number {
  let n = 0;
  for (let i = 1; i < posts.length; i++) {
    if (posts[i]!.author_id === posts[i - 1]!.author_id) n++;
  }
  return n;
}

describe("global feed ranking — diversity", () => {
  it("never puts the same creator back-to-back while other creators remain", () => {
    const pool = realisticPool();
    for (let seed = 1; seed <= 200; seed++) {
      const out = rankGlobalFeedItems(pool, { now: NOW, bucket: seed * 7919 });
      assert.equal(out.length, pool.length);
      // 9 of 18 by one author: perfect alternation is possible, so at most
      // one unavoidable adjacency can remain at the very end.
      assert.ok(adjacentSameAuthor(out) <= 1, `seed ${seed}: ${adjacentSameAuthor(out)}`);
      assert.ok(maxSameAuthorRun(out) <= 2);
    }
  });

  it("diversifyFeed keeps every post and order when already diverse", () => {
    const posts = [
      { id: "1", author_id: "a", community_id: "x" },
      { id: "2", author_id: "b", community_id: "y" },
      { id: "3", author_id: "a", community_id: "x" },
    ];
    assert.deepEqual(diversifyFeed(posts).map((p) => p.id), ["1", "2", "3"]);
    const single = [
      { id: "1", author_id: "a" },
      { id: "2", author_id: "a" },
      { id: "3", author_id: "a" },
    ];
    assert.equal(diversifyFeed(single).length, 3);
  });
});

describe("global feed ranking — refresh & rotation", () => {
  it("same session seed gives the exact same order (stable pagination)", () => {
    const pool = realisticPool();
    const a = rankGlobalFeedItems(pool, { now: NOW, bucket: 424242 });
    const b = rankGlobalFeedItems([...pool].reverse(), { now: NOW, bucket: 424242 });
    assert.deepEqual(a.map((p) => p.id), b.map((p) => p.id));
  });

  it("paging a session by offset yields no duplicates and no gaps", () => {
    const pool = realisticPool();
    const ordered = rankGlobalFeedItems(pool, { now: NOW, bucket: 99 });
    const pages = [ordered.slice(0, 5), ordered.slice(5, 10), ordered.slice(10, 15), ordered.slice(15)];
    const ids = pages.flat().map((p) => p.id);
    assert.equal(new Set(ids).size, pool.length);
  });

  it("new sessions surface different leading posts", () => {
    const pool = realisticPool();
    const heads = new Set<string>();
    const firsts = new Set<string>();
    for (let seed = 1; seed <= 30; seed++) {
      const out = rankGlobalFeedItems(pool, { now: NOW, bucket: seed * 104729 });
      heads.add(out.slice(0, 3).map((p) => p.id).join(","));
      firsts.add(out[0]!.id);
    }
    assert.ok(heads.size >= 20, `only ${heads.size} distinct heads`);
    assert.ok(firsts.size >= 6, `only ${firsts.size} distinct first posts`);
  });

  it("keeps the previous session's head out of the first three slots", () => {
    const pool = realisticPool();
    for (let seed = 1; seed <= 50; seed++) {
      const first = rankGlobalFeedItems(pool, { now: NOW, bucket: seed });
      const avoid = new Set(first.slice(0, 4).map((p) => p.id));
      const next = rankGlobalFeedItems(pool, { now: NOW, bucket: seed + 1_000_003, avoidIds: avoid });
      // Head may only reuse an avoided post when diversity forces it.
      const reused = next.slice(0, 3).filter((p) => avoid.has(p.id)).length;
      assert.ok(reused <= 1, `seed ${seed}: reused ${reused}`);
      assert.ok(!avoid.has(next[0]!.id), `seed ${seed}: first post repeated`);
      assert.equal(next.length, pool.length);
    }
  });

  it("higher real engagement surfaces earlier on average (quality-weighted)", () => {
    const pool = Array.from({ length: 12 }, (_, i) => ({
      id: uuid(i + 100),
      author_id: `u${i}`,
      community_id: `c${i}`,
      created_at: new Date(NOW - 3_600_000 * 24).toISOString(),
      like_count: i === 0 ? 80 : 0,
      comment_count: i === 0 ? 30 : 0,
      view_count: 0,
      body: `b${i}`,
    }));
    let positionSum = 0;
    for (let seed = 1; seed <= 100; seed++) {
      const out = rankGlobalFeedItems(pool, { now: NOW, bucket: seed });
      positionSum += out.findIndex((p) => p.id === pool[0]!.id);
    }
    assert.ok(positionSum / 100 < 2, `avg position ${positionSum / 100}`);
  });

  it("freshenHead never drops posts", () => {
    const items = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];
    const out = freshenHead(items, new Set(["a", "b"]));
    assert.deepEqual(out.map((i) => i.id), ["c", "d", "a", "b"]);
  });
});

describe("feed session seed & head cookie", () => {
  it("seed stays a safe integer and round-trips through the cursor", () => {
    const bucket = getGlobalFeedRotationBucket(NOW);
    assert.ok(Number.isSafeInteger(bucket));
    const parsed = parseGlobalFeedCursor(encodeGlobalFeedCursor({ bucket, offset: 20, asOf: NOW }), NOW);
    assert.equal(parsed.bucket, bucket);
    assert.equal(parsed.offset, 20);
  });

  it("avoid ids accept only UUIDs and are capped", () => {
    const ids = Array.from({ length: 12 }, (_, i) => uuid(i + 1));
    assert.equal(parseFeedAvoidIds(ids.join(",")).length, 8);
    assert.deepEqual(parseFeedAvoidIds("x.;drop table.' or 1=1"), []);
    assert.equal(serializeFeedAvoidIds([uuid(1), "bad", uuid(1)]), uuid(1));
  });
});
