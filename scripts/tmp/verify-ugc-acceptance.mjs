/**
 * UGC production acceptance: remaining IDOR, money redaction, identity gates,
 * webhook idempotency, platform enum, notes RLS.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const insights = read("app/api/ugc/insights/route.ts");
const live = read("app/api/ugc/campaigns/[id]/live/route.ts");
const dashboard = read("app/api/ugc/brand/dashboard/route.ts");
const creatorRep = read("app/api/ugc/reputation/creator/[id]/route.ts");
const brandRep = read("app/api/ugc/reputation/brand/[id]/route.ts");
const saves = read("app/api/ugc/saves/route.ts");
const webhooks = read("lib/ugc/enterprise/webhooks.ts");
const submissions = read("app/api/ugc/submissions/route.ts");
const withdraw = read("app/api/ugc/campaigns/[id]/application/withdraw/route.ts");
const revision = read("app/api/ugc/submissions/[id]/revision/route.ts");
const referrals = read("app/api/ugc/referrals/route.ts");
const library = read("app/api/ugc/library/route.ts");
const notes = read("app/api/ugc/notes/route.ts");
const templatesId = read("app/api/ugc/templates/[id]/route.ts");
const campaignsList = read("app/api/ugc/campaigns/route.ts");
const tokens = read("components/ugc/workspace/ugc-tokens.ts");
const hero = read("components/ugc/workspace/UGCHeroHeader.tsx");
const recruitment = read("components/ugc/brand/CreatorRecruitmentClient.tsx");
const migration = read("database/migrations/135_ugc_acceptance_hardening.sql");
const migrationTwin = read("supabase/migrations/20260828181058_ugc_acceptance_hardening.sql");
const auth = read("lib/ugc/platform/auth.ts");

assert.match(auth, /creatorProfileRequiredPayload/);

assert.match(insights, /showEarnings/);
assert.match(insights, /total_budget: _tb, spent_budget: _sb/);

assert.match(live, /memberCan\(role, "finance\.view"\)/);
assert.match(live, /totalBudget: showFinance \? totalBudget : null/);
assert.match(live, /earningsSum: showFinance \? earningsSum : null/);

assert.match(dashboard, /brandIdFromRequest/);
assert.match(dashboard, /memberCan\(role, "finance\.view"\)/);
assert.match(dashboard, /totalSpend: showFinance \? totalSpend : null/);

assert.match(creatorRep, /canSeeMoney/);
assert.match(creatorRep, /canRecompute/);
assert.match(creatorRep, /total_earnings: null/);
assert.doesNotMatch(creatorRep, /creator: influencer/);
assert.match(brandRep, /total_paid: null/);
assert.match(brandRep, /resolveBrandRole/);
assert.match(brandRep, /Forbidden/);

assert.match(saves, /canReadCampaign/);
assert.match(saves, /status, brand_id/);

assert.match(webhooks, /eq\("idempotency_key", idempotencyKey\)/);
assert.match(webhooks, /23505/);
assert.match(webhooks, /createHmac/);
assert.doesNotMatch(webhooks, /"X-Jimvio-Signature": sub\.secret/);

assert.match(submissions, /creatorProfileRequiredPayload/);
assert.match(submissions, /CAMPAIGN_PLATFORMS|isUgcSubmitPlatform/);
assert.match(withdraw, /creatorProfileRequiredPayload/);
assert.match(revision, /creatorProfileRequiredPayload/);
assert.match(referrals, /creatorProfileRequiredPayload/);
assert.doesNotMatch(referrals, /body\.reward_amount/);
assert.match(library, /creatorProfileRequiredPayload/);
assert.match(notes, /creatorProfileRequiredPayload/);

assert.match(templatesId, /campaigns\.manage/);
assert.match(templatesId, /requireBrandWorkspacePermission/);

assert.match(campaignsList, /CAMPAIGN_PLATFORMS/);
assert.match(tokens, /label: "Facebook"/);
assert.doesNotMatch(tokens, /label: "X"/);
assert.doesNotMatch(hero, /facebook/);
assert.doesNotMatch(recruitment, /facebook/);

assert.match(migration, /author_user_id = auth\.uid\(\)/);
assert.doesNotMatch(migration, /ugc_is_brand_member\(brand_id\)/);
assert.match(migration, /ugc_webhook_deliveries_idempotency_key_uidx/);
assert.equal(migration.trim(), migrationTwin.trim());

console.log("verify-ugc-acceptance: ok");
