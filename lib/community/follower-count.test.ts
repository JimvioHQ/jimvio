import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatFollowerCountLabel,
  resolveProfileFollowerCount,
} from "./follower-count";

describe("resolveProfileFollowerCount", () => {
  it("uses showcase floor for p7provider without fabricating follows", () => {
    assert.equal(
      resolveProfileFollowerCount({
        username: "p7provider",
        follower_count: 2,
      }),
      1233
    );
  });

  it("prefers a higher real count over the showcase floor", () => {
    assert.equal(
      resolveProfileFollowerCount({
        username: "p7provider",
        follower_count: 2000,
      }),
      2000
    );
  });

  it("uses settings display floor when present", () => {
    assert.equal(
      resolveProfileFollowerCount({
        username: "indie",
        follower_count: 4,
        settings: { display_follower_count: 500 },
      }),
      500
    );
  });

  it("falls back to the database count for normal users", () => {
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
