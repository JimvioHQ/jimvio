import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeProgress, listChecklistForIntent } from "./onboarding-checklist";
import { isRolloutIncluded } from "@/lib/ops/feature-flags";

describe("onboarding and experiment assignment", () => {
  it("computes checklist progress from the selected intent", () => {
    assert.equal(computeProgress({}, null), 0);
    const items = listChecklistForIntent("sell");
    assert.equal(items.length > 0, true);
    const done = Object.fromEntries(items.map((item) => [item.key, { done: true }]));
    assert.equal(computeProgress(done, "sell"), 100);
    assert.equal(computeProgress({ [items[0].key]: { done: true } }, "sell"), Math.round(100 / items.length));
  });

  it("assigns the same experiment bucket for the same user and key", () => {
    const userId = "11111111-1111-4111-8111-111111111111";
    assert.equal(isRolloutIncluded("growth.example", userId, 0), false);
    assert.equal(isRolloutIncluded("growth.example", userId, 100), true);
    assert.equal(
      isRolloutIncluded("growth.example", userId, 50),
      isRolloutIncluded("growth.example", userId, 50),
    );
  });
});
