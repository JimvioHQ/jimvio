/**
 * Phase 1 membership helper smoke (no network).
 * Run: node scripts/tmp/verify-ce-memberships.mjs
 */

import assert from "node:assert/strict";

const PLAN_RANK = {
  free: 0,
  monthly: 1,
  yearly: 2,
  lifetime: 3,
};

function eventForChange(from, to) {
  if (PLAN_RANK[to] > PLAN_RANK[from]) return "upgraded";
  if (PLAN_RANK[to] < PLAN_RANK[from]) return "downgraded";
  return "subscribed";
}

assert.equal(eventForChange("free", "monthly"), "upgraded");
assert.equal(eventForChange("yearly", "monthly"), "downgraded");
assert.equal(eventForChange("monthly", "monthly"), "subscribed");

function trialEnds(days, from = new Date("2026-07-20T00:00:00Z")) {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

assert.equal(trialEnds(7), "2026-07-27T00:00:00.000Z");

console.log("✓ Phase 1 membership helpers OK");
