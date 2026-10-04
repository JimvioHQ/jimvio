import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  encodeGlobalFeedCursor,
  getGlobalFeedRotationBucket,
  isExcludedFromGlobalFeed,
  parseGlobalFeedCursor,
  sessionStartCursorFrom,
} from "./global-feed-exclusions.ts";

describe("global feed session seed", () => {
  it("mints a fresh seed when there is no cursor", () => {
    const a = parseGlobalFeedCursor(null, 1_700_000_000_000);
    const b = parseGlobalFeedCursor(null, 1_700_000_000_050);
    assert.equal(a.offset, 0);
    assert.equal(b.offset, 0);
    assert.equal(a.asOf, 1_700_000_000_000);
    assert.equal(b.asOf, 1_700_000_000_050);
    assert.notEqual(a.bucket, b.bucket);
  });

  it("preserves cursor seed and asOf for pagination across wall-clock advances", () => {
    const seed = 1_700_000_000_111;
    const asOf = 1_700_000_000_000;
    const cursor = encodeGlobalFeedCursor({ bucket: seed, offset: 20, asOf });
    const later = parseGlobalFeedCursor(cursor, seed + 60_000);
    assert.deepEqual(later, { bucket: seed, offset: 20, asOf });
  });

  it("accepts legacy 2-part cursors", () => {
    const now = 1_700_000_000_999;
    const parsed = parseGlobalFeedCursor("1700000000111:20", now);
    assert.equal(parsed.bucket, 1_700_000_000_111);
    assert.equal(parsed.offset, 20);
    assert.equal(parsed.asOf, now);
  });

  it("rejects malformed cursors", () => {
    const now = 1_700_000_000_999;
    const a = parseGlobalFeedCursor("nope", now);
    const b = parseGlobalFeedCursor("1:-5", now);
    assert.equal(a.offset, 0);
    assert.equal(a.asOf, now);
    assert.equal(b.offset, 0);
    assert.equal(b.asOf, now);
  });

  it("rotation bucket tracks the provided now for fresh loads", () => {
    const a = getGlobalFeedRotationBucket(42);
    const b = getGlobalFeedRotationBucket(42);
    assert.ok(a >= 42 * 1_000_000);
    assert.ok(b >= 42 * 1_000_000);
    if (a === b) {
      assert.ok(Number.isFinite(a));
    } else {
      assert.notEqual(a, b);
    }
  });

  it("sessionStartCursorFrom resets offset without reminting seed/asOf", () => {
    const cursor = encodeGlobalFeedCursor({
      bucket: 99,
      offset: 40,
      asOf: 1_700_000_000_000,
    });
    assert.equal(
      sessionStartCursorFrom(cursor),
      encodeGlobalFeedCursor({ bucket: 99, offset: 0, asOf: 1_700_000_000_000 }),
    );
    assert.equal(sessionStartCursorFrom(null), null);
  });
});

describe("isExcludedFromGlobalFeed", () => {
  it("excludes promotion posts and Jimvio system posts only", () => {
    assert.equal(
      isExcludedFromGlobalFeed({
        attachments: { jimvio: { origin: "promotion", key: "y" } },
        body: "Hello",
      }),
      true,
    );
    assert.equal(
      isExcludedFromGlobalFeed({
        body: "From Jimvio — try Spaces",
        profiles: { username: "creator" },
      }),
      true,
    );
    assert.equal(
      isExcludedFromGlobalFeed({
        body: "Platform update",
        profiles: { username: "jimvio" },
      }),
      true,
    );
  });

  it("keeps published editorial / demo / seeded persona posts", () => {
    assert.equal(
      isExcludedFromGlobalFeed({
        attachments: { jimvio: { origin: "editorial", key: "x" } },
        body: "Hello from the community",
      }),
      false,
    );
    assert.equal(
      isExcludedFromGlobalFeed({
        body: "Prompt?\n\nShare what you have tried in TypeScript. Prefer specifics over slogans.",
        profiles: { email: "editorial+tina@jimvio.com", username: "tina_v" },
      }),
      false,
    );
  });

  it("keeps organic posts", () => {
    assert.equal(
      isExcludedFromGlobalFeed({
        body: "Shipping our first Jimvio live tonight.",
        profiles: { email: "creator@example.com", username: "creator" },
      }),
      false,
    );
  });
});
