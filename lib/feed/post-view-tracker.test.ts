import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import {
  POST_VIEW_MIN_DWELL_MS,
  POST_VIEW_THRESHOLD,
  __resetPostViewTrackerForTests,
  hasClientSeenPostView,
  queuePostView,
} from "./post-view-tracker.ts";

describe("post view tracker policy", () => {
  beforeEach(() => {
    __resetPostViewTrackerForTests();
  });

  it("documents dwell and intersection thresholds", () => {
    assert.equal(POST_VIEW_MIN_DWELL_MS, 800);
    assert.equal(POST_VIEW_THRESHOLD, 0.5);
  });

  it("dedupes client-side so remounts do not re-queue the same post", () => {
    queuePostView("post-a", 900);
    assert.equal(hasClientSeenPostView("post-a"), true);
    queuePostView("post-a", 900);
    assert.equal(hasClientSeenPostView("post-a"), true);
  });

  it("ignores empty post ids", () => {
    queuePostView("", 900);
    assert.equal(hasClientSeenPostView(""), false);
  });
});
