import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluateProfileStrength } from "./creator-profile-completion";

describe("evaluateProfileStrength", () => {
  it("does not hardcode 100% for empty profiles", () => {
    const empty = evaluateProfileStrength({});
    assert.equal(empty.percent, 0);
    assert.ok(empty.nextHint);
  });

  it("increases with real filled fields", () => {
    const partial = evaluateProfileStrength({
      fullName: "Ada Lovelace",
      headline: "Creator",
      bio: "Bio text",
    });
    assert.ok(partial.percent > 0);
    assert.ok(partial.percent < 100);
  });
});
