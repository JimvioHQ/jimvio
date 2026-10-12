/**
 * Static gate: fixed payout DB uniqueness + atomic max_participants.
 */
import assert from "node:assert/strict";
import fs from "node:fs";

const root = process.cwd();
function read(rel) {
  return fs.readFileSync(`${root}/${rel}`, "utf8");
}

const migDb = read("database/migrations/145_ugc_payout_join_concurrency.sql");
const migSb = read("supabase/migrations/20260908180000_ugc_payout_join_concurrency.sql");
const credit = read("lib/ugc/credit-fixed-payout.ts");
const joinService = read("lib/ugc/join-service.ts");
const syncViews = read("lib/ugc/syncViews.ts");
const activate = read("app/api/admin/ugc/campaigns/[id]/activate/route.ts");
const brandPatch = read("app/api/ugc/campaigns/[id]/route.ts");
const revision = read("app/api/ugc/submissions/[id]/revision/route.ts");
const submitApi = read("app/api/ugc/submissions/route.ts");

for (const mig of [migDb, migSb]) {
  assert.match(mig, /is_fixed_one_shot/);
  assert.match(mig, /ugc_payouts_fixed_one_shot_submission_uidx/);
  assert.match(mig, /WHERE is_fixed_one_shot IS TRUE/);
  assert.match(mig, /ugc_enforce_campaign_capacity/);
  assert.match(mig, /FOR UPDATE/);
  assert.match(mig, /max_participants/);
  assert.match(mig, /trg_ugc_enforce_campaign_capacity/);
  assert.doesNotMatch(mig, /DELETE FROM public\.ugc_payouts/);
}

assert.match(credit, /is_fixed_one_shot:\s*true/);
assert.match(credit, /\.eq\("is_fixed_one_shot", true\)/);
assert.match(credit, /23505/);
assert.match(credit, /\.eq\("spent_budget", spent\)/);

assert.match(joinService, /isCapacityFullError/);
assert.match(joinService, /Campaign is full/);
assert.match(joinService, /23505/);

// Platform view sync must not create payouts.
assert.doesNotMatch(syncViews, /is_fixed_one_shot:\s*true/);
assert.doesNotMatch(syncViews, /ugc_payouts/);
assert.match(syncViews, /syncedViewsMayCreateReward/);

assert.match(activate, /ugc\.campaign\.activate_override/);
assert.doesNotMatch(activate, /from\("ugc_campaign_escrow"\)\.insert/);
assert.match(brandPatch, /status: 402/);
assert.match(revision, /Only pending submissions can receive a revision request/);
assert.match(submitApi, /participation\.status !== "accepted"/);

console.log("verify-ugc-concurrency-hardening: ok");
