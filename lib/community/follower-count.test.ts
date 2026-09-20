import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatFollowerCountLabel,
  resolveProfileFollowerCount,
} from "./follower-count";

describe("resolveProfileFollowerCount", () => {
  it("uses real follower_count only (no showcase inflation)", () => {
    assert.equal(
      resolveProfileFollowerCount({
        username: "p7provider",
        follower_count: 2,
      }),
      2
    );
  });

  it("ignores settings display floors", () => {
    assert.equal(
      resolveProfileFollowerCount({
        username: "indie",
        follower_count: 4,
        settings: { display_follower_count: 500 },
      }),
      4
    );
  });

  it("falls back to zero when missing", () => {
    assert.equal(resolveProfileFollowerCount(null), 0);
    assert.equal(
      resolveProfileFollowerCount({
        username: "alice",
        follower_count: 17,
      }),
      17
    );
  });
});

describe("formatFollowerCountLabel", () => {
  it("formats singular and plural", () => {
    assert.equal(formatFollowerCountLabel(1), "1 follower");
    assert.equal(formatFollowerCountLabel(1233), "1,233 followers");
  });
});
