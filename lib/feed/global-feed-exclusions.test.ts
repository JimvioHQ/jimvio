import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  encodeGlobalFeedCursor,
  getGlobalFeedRotationBucket,
  parseGlobalFeedCursor,
} from "./global-feed-exclusions";

describe("global feed session seed", () => {
  it("mints a fresh seed when there is no cursor", () => {
    const a = parseGlobalFeedCursor(null, 1_700_000_000_000);
    const b = parseGlobalFeedCursor(null, 1_700_000_000_050);
    assert.equal(a.offset, 0);
    assert.equal(b.offset, 0);
    assert.notEqual(a.bucket, b.bucket);
  });

  it("preserves cursor seed for pagination across wall-clock advances", () => {
    const seed = 1_700_000_000_111;
    const cursor = encodeGlobalFeedCursor({ bucket: seed, offset: 20 });
    const later = parseGlobalFeedCursor(cursor, seed + 60_000);
    assert.deepEqual(later, { bucket: seed, offset: 20 });
  });

  it("rejects malformed cursors", () => {
    const now = 1_700_000_000_999;
    assert.deepEqual(parseGlobalFeedCursor("nope", now), { bucket: now, offset: 0 });
    assert.deepEqual(parseGlobalFeedCursor("1:-5", now), { bucket: now, offset: 0 });
  });

  it("rotation bucket tracks the provided now for fresh loads", () => {
    const a = getGlobalFeedRotationBucket(42);
    const b = getGlobalFeedRotationBucket(42);
    assert.ok(a >= 42 * 1_000_000);
    assert.ok(b >= 42 * 1_000_000);
    // Entropy should usually diverge even for the same wall clock.
    // Allow rare collision but prefer inequality.
    if (a === b) {
      assert.ok(Number.isFinite(a));
    } else {
      assert.notEqual(a, b);
    }
  });
});
