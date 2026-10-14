import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { rotateStoryAuthors, storyCommunityWindow } from "./story-rotation.ts";

describe("story rotation", () => {
  const groups = [
    { author_id: "a" },
    { author_id: "b" },
    { author_id: "c" },
    { author_id: "me" },
  ];

  it("keeps the viewer first and rotates the other authors", () => {
    const first = rotateStoryAuthors(groups, 0, "me").map((g) => g.author_id);
    const next = rotateStoryAuthors(groups, 1, "me").map((g) => g.author_id);
    assert.equal(first[0], "me");
    assert.equal(next[0], "me");
    assert.notDeepEqual(first.slice(1), next.slice(1));
    assert.deepEqual(new Set(next), new Set(["me", "a", "b", "c"]));
  });

  it("moves the community refresh window instead of always scanning the same prefix", () => {
    const communities = ["c0", "c1", "c2", "c3", "c4", "c5"];
    const a = storyCommunityWindow(communities, 0, 3);
    const b = storyCommunityWindow(communities, 1, 3);
    assert.deepEqual(a, ["c0", "c1", "c2"]);
    assert.deepEqual(b, ["c3", "c4", "c5"]);
  });
});
