/**
 * UGC production completion: funding confirmation, team RBAC, automations,
 * notes, discover, i18n, IDOR gates.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const root = process.cwd();
function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

async function loadTs(rel) {
  const require = createRequire(import.meta.url);
  const ts = require("typescript");
  const src = read(rel);
  const { outputText } = ts.transpileModule(src, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
    },
    fileName: path.basename(rel),
  });
  const out = path.join(os.tmpdir(), `${path.basename(rel, ".ts")}-${process.pid}-${Math.random().toString(16).slice(2)}.mjs`);
  fs.writeFileSync(out, outputText);
  try {
    return await import(pathToFileURL(out).href);
  } finally {
    try {
      fs.unlinkSync(out);
    } catch {
      /* ignore */
    }
  }
}

const deposit = read("app/api/ugc/campaigns/[id]/deposit/route.ts");
const confirm = read("lib/ugc/confirm-escrow-payment.ts");
const paymentHook = read("app/api/webhooks/payment/route.ts");
const flwCb = read("app/api/payments/flutterwave/callback/route.ts");
const nowp = read("app/api/webhooks/nowpayments/route.ts");
const brandAccess = read("lib/ugc/enterprise/brand-access.ts");
const perms = read("lib/ugc/enterprise/permissions.ts");
const campaignsGet = read("app/api/ugc/campaigns/[id]/route.ts");
const campaignsList = read("app/api/ugc/campaigns/route.ts");
const approve = read("app/api/ugc/submissions/[id]/approve/route.ts");
const aiReview = read("app/api/ugc/ai/review/route.ts");
const notes = read("app/api/ugc/notes/route.ts");
const automations = read("lib/ugc/enterprise/run-automations.ts");
const events = read("lib/ugc/enterprise/events.ts");
const workflowRun = read("app/api/ugc/workflows/[id]/run/route.ts");
const locale = read("context/LocaleContext.tsx");
const messages = read("lib/ugc/i18n/messages.ts");
const layout = read("app/ugc/layout.tsx");
const fund = read("components/ugc/campaign-center/CampaignFundClient.tsx");
const discover = read("components/ugc/workspace/UGCDiscoverPage.tsx");
const migration = read("database/migrations/134_ugc_production_completion.sql");
const viewsSync = read("app/api/ugc/views/sync/route.ts");
const listSub = read("app/api/ugc/submissions/route.ts");
const invitations = read("app/api/ugc/invitations/route.ts");
const chatMessages = read("app/api/ugc/chat/threads/[id]/messages/route.ts");
const disputesById = read("app/api/ugc/disputes/[id]/route.ts");

assert.match(deposit, /requireCampaignPermission/);
assert.match(deposit, /finance\.payout/);
assert.match(deposit, /createFlutterwavePaymentLink/);
assert.match(deposit, /createNowPaymentsInvoice/);
assert.match(deposit, /checkout_url/);
assert.match(deposit, /pending: true/);
assert.doesNotMatch(deposit, /Forbidden - User does not own this campaign/);

assert.match(confirm, /eq\("status", "pending"\)/);
assert.match(confirm, /confirmUgcEscrowFromProviderEvent/);
assert.match(confirm, /assertCampaignReadyForFunding/);
assert.match(confirm, /canActivate/);
assert.match(paymentHook, /confirmUgcEscrowFromProviderEvent/);
assert.match(flwCb, /confirmUgcEscrowPayment/);
assert.match(nowp, /confirmUgcEscrowPayment/);

assert.match(brandAccess, /listAccessibleBrandIds/);
assert.match(brandAccess, /requireCampaignPermission/);
assert.match(brandAccess, /optionalBrandWorkspace/);
assert.match(brandAccess, /userCanAccessBrand/);
assert.match(perms, /finance\.payout/);
assert.match(perms, /viewer: new Set\(\["finance\.view"\]\)/);

assert.match(campaignsGet, /canReadCampaign/);
assert.match(campaignsGet, /access\.role !== "owner"/);
assert.match(campaignsList, /listAccessibleBrandIds/);
assert.match(campaignsList, /featured/);
assert.match(campaignsList, /query = query\.eq\('status', 'active'\)/);
assert.match(campaignsList, /min_budget/);

assert.match(approve, /campaigns\.review/);
assert.match(aiReview, /requireCampaignPermission/);
assert.match(notes, /scope === "creator"/);
assert.match(notes, /campaigns\.review/);
assert.match(notes, /ugc_campaign_participants/);

assert.match(automations, /ugc_automation_runs/);
assert.match(automations, /23505/);
assert.match(automations, /existing\?\.status !== "failed"/);
assert.match(events, /runUgcAutomations/);
assert.doesNotMatch(workflowRun, /simulated: true/);
assert.match(workflowRun, /steps_skipped/);

assert.match(locale, /useLocale/);
assert.match(messages, /featuredCampaigns/);
assert.match(messages, /roleViewer/);
assert.match(messages, /campaignCenter/);
assert.match(messages, /createCampaign/);
assert.match(layout, /LocaleProvider/);
assert.match(fund, /checkout_url/);
assert.match(discover, /featured=true/);
assert.match(discover, /params\.set\("q"/);

assert.match(migration, /ugc_campaign_notes/);
assert.match(migration, /UNIQUE \(automation_id, entity_id\)/);
assert.match(viewsSync, /releasePendingPayouts/);
assert.match(listSub, /listAccessibleBrandIds/);
assert.match(invitations, /creators\.invite/);
assert.match(invitations, /requireCampaignPermission/);
assert.match(chatMessages, /userCanAccessBrand/);
assert.match(chatMessages, /role === "viewer"/);
assert.match(disputesById, /userCanAccessBrand/);
assert.doesNotMatch(disputesById, /existing\.brand_id === vendor\.id/);

const permMod = await loadTs("lib/ugc/enterprise/permissions.ts");
assert.equal(permMod.roleCan("viewer", "campaigns.manage"), false);
assert.equal(permMod.roleCan("viewer", "finance.payout"), false);
assert.equal(permMod.roleCan("reviewer", "finance.payout"), false);
assert.equal(permMod.roleCan("finance", "campaigns.manage"), false);
assert.equal(permMod.roleCan("finance", "finance.payout"), true);
assert.equal(permMod.roleCan("manager", "finance.payout"), false);
assert.equal(permMod.roleCan("manager", "campaigns.manage"), true);
assert.equal(permMod.roleCan("owner", "team.manage"), true);

const i18n = await loadTs("lib/ugc/i18n/messages.ts");
assert.equal(i18n.normalizeUgcLocale("fr-FR"), "fr");
assert.equal(i18n.normalizeUgcLocale("rw"), "rw");
assert.ok(i18n.ugcMessage("fr", "retry").length > 0);
assert.ok(i18n.ugcMessage("rw", "fundCampaign").length > 0);
assert.notEqual(i18n.ugcMessage("en", "retry"), i18n.ugcMessage("fr", "retry"));

console.log("verify-ugc-production-completion: ok");
