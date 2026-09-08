import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { prependUniqueById } from "./session-boost-post";

describe("prependUniqueById", () => {
  it("puts boost first and removes duplicates", () => {
    const posts = [
      { id: "a", body: "A" },
      { id: "b", body: "B" },
      { id: "c", body: "C" },
    ];
    const boost = { id: "mine", body: "Mine" };
    assert.deepEqual(prependUniqueById(posts, boost), [
      boost,
      { id: "a", body: "A" },
      { id: "b", body: "B" },
      { id: "c", body: "C" },
    ]);
  });

  it("dedupes when boost already exists in the list", () => {
    const posts = [
      { id: "a", body: "A" },
      { id: "mine", body: "Old" },
      { id: "b", body: "B" },
    ];
    const boost = { id: "mine", body: "Mine" };
    assert.deepEqual(prependUniqueById(posts, boost), [
      boost,
      { id: "a", body: "A" },
      { id: "b", body: "B" },
    ]);
  });

  it("returns original list when boost is null", () => {
    const posts = [{ id: "a", body: "A" }];
    assert.equal(prependUniqueById(posts, null), posts);
  });
});
