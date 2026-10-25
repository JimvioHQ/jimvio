import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classifyDigestResult, digestCopy, digestEventKey, digestWeekKey, weeklyDigestAllowed } from "./digest";

describe("weekly digest guards", () => {
  it("uses one event key per ISO week and ignores a missing preference row", () => {
    assert.equal(digestWeekKey(new Date("2026-10-25T12:00:00.000Z")), "2026-W43");
    assert.equal(digestWeekKey(new Date("2025-12-29T00:00:00.000Z")), "2026-W01");
    assert.equal(digestEventKey(new Date("2026-10-25T23:00:00.000Z")), "growth-digest:2026-W43");
    assert.equal(weeklyDigestAllowed(null), false);
    assert.equal(weeklyDigestAllowed({ email_weekly_digest: false }), false);
    assert.equal(weeklyDigestAllowed({ email_weekly_digest: true }), true);
    assert.equal(digestCopy({ communitiesOwned: 1, productsListed: 2, productsSold: 3 }).includes("this week"), false);
  });

  it("counts a repeated event key as a duplicate and a publish failure as failed", () => {
    assert.equal(classifyDigestResult({ ok: true }), "sent");
    assert.equal(classifyDigestResult({ ok: true, skipped: true, reason: "duplicate_event_key" }), "duplicate");
    assert.equal(classifyDigestResult({ ok: false, reason: "insert_failed" }), "failed");
    assert.equal(classifyDigestResult(undefined), "failed");
  });
});
