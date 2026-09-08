/**
 * UGC production E2E hardening static gate.
 */
import assert from "node:assert/strict";
import fs from "node:fs";

const root = process.cwd();
function read(rel) {
  return fs.readFileSync(`${root}/${rel}`, "utf8");
}

const joinApi = read("app/api/ugc/campaigns/[id]/join/route.ts");
const brandPatch = read("app/api/ugc/campaigns/[id]/route.ts");
const activate = read("app/api/admin/ugc/campaigns/[id]/activate/route.ts");
const fundUi = read("components/ugc/campaign-center/CampaignFundClient.tsx");
const messages = read("lib/ugc/i18n/messages.ts");
const quality = read("lib/ugc/enterprise/quality-engine.ts");
const syncViews = read("lib/ugc/syncViews.ts");
const credit = read("lib/ugc/credit-fixed-payout.ts");
const joinService = read("lib/ugc/join-service.ts");
const revision = read("app/api/ugc/submissions/[id]/revision/route.ts");
const submitApi = read("app/api/ugc/submissions/route.ts");
const participants = read("app/api/ugc/campaigns/[id]/participants/route.ts");
const createPage = read("app/ugc/campaign-center/create/page.tsx");
const joinFlow = read("components/ugc/join/CampaignJoinFlow.tsx");
const brandSubs = read("app/ugc/campaign-center/[id]/submissions/page.tsx");
const adminUi = read("components/admin/admin-campaigns-client.tsx");

assert.match(createPage, /loginUrlForReturnPath\("\/ugc\/campaign-center\/create"\)/);
assert.match(brandPatch, /status', 'held'/);
assert.match(brandPatch, /status: 402/);

assert.match(activate, /requirePlatformAdmin/);
assert.match(activate, /ugc\.campaign\.activate_override/);
assert.doesNotMatch(activate, /from\("ugc_campaign_escrow"\)\.insert/);
assert.match(activate, /activated_by_admin: true/);
// Must not mutate spent_budget on override write
assert.match(
  activate,
  /\.update\(\{\s*status: "active",\s*activated_by_admin: true,/,
);
assert.doesNotMatch(
  activate,
  /\.update\(\{\s*status: "active",[\s\S]{0,200}spent_budget\s*:/,
);

assert.match(fundUi, /alreadyActiveAdminDetail/);
assert.match(fundUi, /escrowHeld/);
assert.match(fundUi, /showFundDespiteActive/);
assert.match(messages, /alreadyActiveAdminDetail/);
assert.match(adminUi, /Escrow:/);

assert.match(quality, /escrow\?\.status === "held"/);
assert.doesNotMatch(quality, /Number\(escrow\?\.amount ?? 0\) > 0/);

assert.match(joinApi, /termsAccepted !== true/);
assert.match(joinFlow, /acceptAllTerms/);

assert.match(submitApi, /status !== 'active'/);
assert.match(submitApi, /participation\.status !== "accepted"/);

assert.match(revision, /Only pending submissions can receive a revision request/);
assert.match(revision, /\.in\("status", \["pending", "revision_requested"\]\)/);

assert.match(brandSubs, /revision_requested/);
assert.match(brandSubs, /s\.status === "pending" \|\| s\.status === "revision_requested"/);

assert.match(joinService, /reviewableFrom/);
assert.match(joinService, /\.in\("status", reviewableFrom\)/);
assert.doesNotMatch(participants, /profile_image, user_id/);

const casIdx = syncViews.indexOf(".eq('spent_budget', spent)");
const snapIdx = syncViews.indexOf("ugc_view_snapshots");
assert.ok(casIdx > 0 && snapIdx > casIdx, "budget CAS must happen before snapshot insert");
assert.match(syncViews, /remainingBudget/);
assert.match(syncViews, /revertBudget/);

assert.match(credit, /\.eq\("spent_budget", spent\)/);
assert.match(credit, /existingRows/);

console.log("verify-ugc-e2e-hardening: ok");
