import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mergeCommentLists } from "./comment-list-merge.ts";

describe("mergeCommentLists", () => {
  it("keeps local comments when server returns empty (stale GET race)", () => {
    const prev = [
      { id: "c1", body: "hy", created_at: "2026-10-05T00:00:00Z" },
      { id: "optimistic-1", body: "pending", created_at: "2026-10-05T00:00:01Z" },
    ];
    const merged = mergeCommentLists(prev, []);
    assert.equal(merged.length, 2);
    assert.ok(merged.some((c) => c.id === "c1"));
    assert.ok(merged.some((c) => c.id === "optimistic-1"));
  });

  it("prefers server rows and dedupes by id", () => {
    const prev = [{ id: "c1", body: "old", created_at: "a" }];
    const server = [{ id: "c1", body: "new", created_at: "a" }];
    const merged = mergeCommentLists(prev, server);
    assert.equal(merged.length, 1);
    assert.equal(merged[0]?.body, "new");
  });

  it("allows true empty when both sides empty", () => {
    assert.deepEqual(mergeCommentLists([], []), []);
  });
});
