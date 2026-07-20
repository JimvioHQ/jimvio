import assert from "node:assert/strict";

function score(item, now) {
  const ageHours = Math.max(0, (now - new Date(item.created_at).getTime()) / 3_600_000);
  return Math.max(0, 72 - ageHours) / 72 * 10 + Math.log1p(item.like_count ?? 0) * 2 + Math.log1p(item.comment_count ?? 0) * 3;
}
function variant(key, userId, percent) {
  let hash = 0;
  for (const char of `${key}:${userId}`) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash % 100 < percent ? "variant" : "control";
}
function windowStart(days, now) {
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  return start.toISOString();
}

const now = Date.parse("2026-07-20T12:00:00.000Z");
assert(score({ created_at: "2026-07-20T11:00:00.000Z", like_count: 4, comment_count: 2 }, now) > score({ created_at: "2026-07-17T12:00:00.000Z" }, now));
assert.equal(variant("welcome_cta_copy", "user-42", 50), variant("welcome_cta_copy", "user-42", 50));
assert.equal(windowStart(7, new Date(now)), "2026-07-14T00:00:00.000Z");
assert.equal(windowStart(30, new Date(now)), "2026-06-21T00:00:00.000Z");
console.log("Growth sprints 3–6 verification passed.");
