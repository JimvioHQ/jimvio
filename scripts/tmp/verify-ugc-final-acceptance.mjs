/**
 * Final UGC production-acceptance checklist. Asserts against real application
 * source and the canonical validator — not a parallel fake implementation.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "os";
import path from "path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const root = process.cwd();
function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

async function loadTs(rel, rewrite = []) {
  const require = createRequire(import.meta.url);
  const ts = require("typescript");
  let src = read(rel);
  const { outputText } = ts.transpileModule(src, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: path.basename(rel),
  });
  let js = outputText;
  for (const [from, to] of rewrite) js = js.replace(from, to);
  const out = path.join(
    os.tmpdir(),
    `${path.basename(rel, ".ts")}-final-${process.pid}.mjs`,
  );
  fs.writeFileSync(out, js);
  return import(pathToFileURL(out).href);
}

async function loadEscrowAmount() {
  const require = createRequire(import.meta.url);
  const ts = require("typescript");
  const moneySrc = read("lib/money.ts");
  const { outputText: moneyJs } = ts.transpileModule(moneySrc, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    fileName: "money.ts",
  });
  const moneyOut = path.join(os.tmpdir(), `money-final-${process.pid}.mjs`);
  fs.writeFileSync(moneyOut, moneyJs);
  const src = read("lib/ugc/escrow-amount.ts");
  const { outputText } = ts.transpileModule(src, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    fileName: "escrow-amount.ts",
  });
  const rewritten = outputText.replace(
    /from ["']@\/lib\/money["']/,
    `from ${JSON.stringify(pathToFileURL(moneyOut).href)}`,
  );
  const out = path.join(os.tmpdir(), `escrow-amount-final-${process.pid}.mjs`);
  fs.writeFileSync(out, rewritten);
  return import(pathToFileURL(out).href);
}

const campaigns = read("app/api/ugc/campaigns/route.ts");
const patch = read("app/api/ugc/campaigns/[id]/route.ts");
const deposit = read("app/api/ugc/campaigns/[id]/deposit/route.ts");
const confirm = read("lib/ugc/confirm-escrow-payment.ts");
const wizardSrc = read("lib/ugc/campaign-wizard-validation.ts");
const join = read("app/api/ugc/campaigns/[id]/join/route.ts");
const submissions = read("app/api/ugc/submissions/route.ts");
const approve = read("app/api/ugc/submissions/[id]/approve/route.ts");
const credit = read("lib/ugc/credit-fixed-payout.ts");
const notes = read("app/api/ugc/notes/route.ts");
const referrals = read("app/api/ugc/referrals/route.ts");
const flw = read("app/api/payments/flutterwave/webhook/route.ts");
const nowp = read("app/api/webhooks/nowpayments/route.ts");
const unified = read("app/api/webhooks/payment/route.ts");
const invitations = read("app/api/ugc/invitations/[id]/route.ts");
const permissionsSrc = read("lib/ugc/enterprise/permissions.ts");
const submitPage = read("app/ugc/[id]/submit/page.tsx");
const layout = read("app/layout.tsx");
const locale = read("context/LocaleContext.tsx");
const payoutsSchema = read("database/migrations/00.sql");
const vercel = read("vercel.json");
const workflowRun = read("app/api/ugc/workflows/[id]/run/route.ts");
const sync = read("lib/identity/sync.ts");
const auth = read("lib/ugc/platform/auth.ts");

// 1–2 incomplete campaign cannot fund / activate
assert.match(deposit, /assertCampaignReadyForFunding/);
assert.match(confirm, /assertCampaignReadyForFunding/);
assert.doesNotMatch(deposit, /if \(campaign\.status === "draft"\)/);

// 3–7 wizard: requirements, visited != complete, draft != ready, fixed vs per-view, invalid platform
assert.match(wizardSrc, /min_duration/);
assert.match(wizardSrc, /max_duration/);
assert.match(wizardSrc, /CAMPAIGN_PLATFORMS = \["tiktok", "instagram", "youtube", "facebook"\]/);
assert.doesNotMatch(wizardSrc, /"x"/);

// 8 anonymous users only see active
assert.match(campaigns, /query = query\.eq\('status', 'active'\)/);

// 9–10 identity + influencer mirror
assert.match(auth, /creatorProfileRequiredPayload|loadCreatorProfileCompletion/);
assert.match(join, /Complete your creator profile first|creatorProfileRequiredPayload|needsProfile/);
assert.match(sync, /ensureInfluencerMirror/);
assert.match(sync, /23505/);

// 11–16 ownership + RBAC
assert.match(submissions, /assertCanReadSubmission|influencer_id|requireInfluencer/);
assert.match(approve, /requireCampaignPermission/);
assert.match(approve, /campaigns\.review/);
assert.match(permissionsSrc, /viewer: new Set\(\["finance\.view"\]\)/);
assert.match(permissionsSrc, /reviewer: new Set\(\["campaigns\.review"/);
assert.match(invitations, /creators\.invite/);
assert.match(deposit, /finance\.payout|campaigns\.manage/);

// 17–21 webhooks / underpayment / duplicate escrow
assert.match(unified, /confirmUgcEscrowFromProviderEvent/);
assert.match(unified, /isDuplicate/);
assert.match(flw, /confirmUgcEscrowFromProviderEvent/);
assert.match(flw, /status: 401/);
assert.match(nowp, /status: 401/);
assert.match(deposit, /23505/);
assert.match(confirm, /paidAmountCoversEscrow/);
assert.match(confirm, /alreadyHeld/);

// 22–26 wallet CAS, refund, concurrent approval, budget, payout once
assert.match(deposit, /\.eq\("available_balance", available\)/);
assert.match(deposit, /refundWalletDebit/);
assert.match(credit, /\.eq\("spent_budget", spent\)/);
assert.match(credit, /casCreditCreatorBalances/);
assert.match(credit, /revertBudget/);
assert.match(approve, /\.in\('status', REVIEWABLE\)/);
assert.doesNotMatch(payoutsSchema, /UNIQUE \(submission_id\)/);

// 27 notes author-only deletion
assert.match(notes, /\.eq\("author_user_id", user\.id\)/);

// 28 referral reward not client-controlled
assert.doesNotMatch(referrals, /body\.reward_amount/);
assert.match(referrals, /reward_amount: 5/);

// 29–30 public search / Facebook
assert.match(campaigns, /searchParams\.get\('q'\)/);
assert.match(campaigns, /searchParams\.get\('platform'\)/);
assert.equal(wizardSrc.includes('"facebook"'), true);
assert.match(submitPage, /Facebook/);

// 31 i18n locale
assert.match(layout, /UGC_LOCALE_COOKIE/);
assert.match(locale, /root\.lang = locale/);

// 32 workflow not faked with timers
assert.match(workflowRun, /completed_with_skipped/);
assert.doesNotMatch(workflowRun, /setTimeout/);
assert.doesNotMatch(vercel, /ugc\/workflows/);

const wizard = await (async () => {
  const require = createRequire(import.meta.url);
  const ts = require("typescript");
  const compilerOptions = { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 };
  const compile = (rel) => ts.transpileModule(read(rel), { compilerOptions, fileName: rel }).outputText;
  const geoOut = path.join(os.tmpdir(), `buyer-country-final-${process.pid}.mjs`);
  const briefOut = path.join(os.tmpdir(), `campaign-brief-final-${process.pid}.mjs`);
  fs.writeFileSync(geoOut, compile("lib/geo/buyer-country.ts"));
  const brief = compile("lib/ugc/campaign-brief.ts").replace(
    /from\s+["']@\/lib\/geo\/buyer-country["']/g,
    `from ${JSON.stringify(pathToFileURL(geoOut).href)}`,
  );
  fs.writeFileSync(briefOut, brief);
  return loadTs("lib/ugc/campaign-wizard-validation.ts", [[
    /from\s+["']@\/lib\/ugc\/campaign-brief["']/g,
    `from ${JSON.stringify(pathToFileURL(briefOut).href)}`,
  ]]);
})();
const incomplete = {
  title: "x",
  campaign_type: "ugc",
  payment_model: "per_views",
  total_budget: 1000,
  rate_per_1k_views: 1,
  allowed_platforms: ["tiktok"],
};
assert.equal(wizard.assertCampaignReadyForFunding(incomplete).success, false, "1 requirements cannot be skipped");
assert.equal(wizard.isCampaignStepComplete(incomplete, 4), false, "4 visited != completed");
assert.equal(wizard.validateCampaignWizardReady(incomplete).success, false, "5 draft != ready");

const fixed = {
  title: "Ready",
  campaign_type: "ugc",
  payment_model: "fixed_per_content",
  total_budget: 5000,
  fixed_rate: 50,
  allowed_platforms: ["tiktok"],
  min_duration: 10,
  max_duration: 60,
};
assert.equal(wizard.assertCampaignReadyForFunding(fixed).success, true, "6 fixed does not require per-view");
assert.equal(
  wizard.validateCampaignStep("targeting", { ...fixed, allowed_platforms: ["facebook"] }).success,
  true,
  "7 facebook is a supported platform",
);
assert.equal(
  wizard.validateCampaignStep("targeting", { ...fixed, allowed_platforms: ["x"] }).success,
  false,
  "7 x is not a new campaign platform",
);

const perms = await loadTs("lib/ugc/enterprise/permissions.ts");
assert.equal(perms.roleCan("viewer", "campaigns.manage"), false, "14 viewer mutation");
assert.equal(perms.roleCan("viewer", "creators.invite"), false);
assert.equal(perms.roleCan("reviewer", "finance.payout"), false, "15 reviewer funding");
assert.equal(perms.roleCan("finance", "campaigns.manage"), false, "16 finance campaign-manage");
assert.equal(perms.roleCan("finance", "team.manage"), false);
assert.equal(perms.roleCan("owner", "team.manage"), true);

const amount = await loadEscrowAmount();
assert.equal(
  amount.paidAmountCoversEscrow({
    expected: 1000,
    escrowCurrency: "RWF",
    paidAmount: 500,
    paidCurrency: "RWF",
  }),
  false,
  "19 underpayment",
);
assert.equal(
  amount.paidAmountCoversEscrow({
    expected: 1000,
    escrowCurrency: "RWF",
    paidAmount: 0.01,
    paidCurrency: "USD",
  }),
  false,
  "20 cross-currency underpayment",
);

const i18n = await loadTs("lib/ugc/i18n/messages.ts");
assert.equal(i18n.normalizeUgcLocale("rw"), "rw", "31 i18n locale");
assert.notEqual(i18n.ugcMessage("en", "createCampaign"), i18n.ugcMessage("fr", "createCampaign"));

console.log("verify-ugc-final-acceptance: ok");
