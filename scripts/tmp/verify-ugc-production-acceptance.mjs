/**
 * UGC production acceptance: money invariants, mutation RBAC, i18n keys,
 * honest workflow skips, SSR locale cookie. Does not weaken prior verifies.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "os";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const root = process.cwd();
function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

async function loadEscrowAmount() {
  const require = createRequire(import.meta.url);
  const ts = require("typescript");
  const moneySrc = read("lib/money.ts");
  const { outputText: moneyJs } = ts.transpileModule(moneySrc, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: "money.ts",
  });
  const moneyOut = path.join(os.tmpdir(), `money-${process.pid}.mjs`);
  fs.writeFileSync(moneyOut, moneyJs);

  const src = read("lib/ugc/escrow-amount.ts");
  const { outputText } = ts.transpileModule(src, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: "escrow-amount.ts",
  });
  const rewritten = outputText.replace(
    /from ["']@\/lib\/money["']/,
    `from ${JSON.stringify(pathToFileURL(moneyOut).href)}`,
  );
  const out = path.join(os.tmpdir(), `escrow-amount-${process.pid}.mjs`);
  fs.writeFileSync(out, rewritten);
  return import(pathToFileURL(out).href);
}

async function loadTs(rel) {
  const require = createRequire(import.meta.url);
  const ts = require("typescript");
  const src = read(rel);
  const { outputText } = ts.transpileModule(src, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: path.basename(rel),
  });
  const out = path.join(
    os.tmpdir(),
    `${path.basename(rel, ".ts")}-${process.pid}-${Math.random().toString(16).slice(2)}.mjs`,
  );
  fs.writeFileSync(out, outputText);
  return import(pathToFileURL(out).href);
}

const deposit = read("app/api/ugc/campaigns/[id]/deposit/route.ts");
const credit = read("lib/ugc/credit-fixed-payout.ts");
const confirm = read("lib/ugc/confirm-escrow-payment.ts");
const flwWebhook = read("app/api/payments/flutterwave/webhook/route.ts");
const nowpWebhook = read("app/api/webhooks/nowpayments/route.ts");
const invitationsId = read("app/api/ugc/invitations/[id]/route.ts");
const insights = read("app/api/ugc/insights/route.ts");
const submitPage = read("app/ugc/[id]/submit/page.tsx");
const disputes = read("app/api/ugc/disputes/[id]/route.ts");
const disputeMsgs = read("app/api/ugc/disputes/[id]/messages/route.ts");
const crmPost = read("app/api/ugc/crm/lists/route.ts");
const favorites = read("app/api/ugc/favorites/creators/route.ts");
const deliveries = read("app/api/ugc/webhooks/[id]/deliveries/route.ts");
const workflowRun = read("app/api/ugc/workflows/[id]/run/route.ts");
const layout = read("app/layout.tsx");
const locale = read("context/LocaleContext.tsx");
const schema = read("supabase/migrations/20260802140000_ugc_enterprise_intelligence.sql");
const payoutsSchema = read("database/migrations/00.sql");
const vercel = read("vercel.json");
const card = read("components/ugc/workspace/UGCPremiumCampaignCard.tsx");
const wizard = read("components/ugc/campaign-center/CampaignCreateWizard.tsx");
const permissions = read("lib/ugc/enterprise/permissions.ts");

assert.match(deposit, /assertCampaignReadyForFunding/);
assert.doesNotMatch(deposit, /if \(campaign\.status === "draft"\)/);
assert.match(deposit, /refundWalletDebit/);
assert.match(deposit, /select\("id"\)/);
assert.match(deposit, /Could not reverse wallet debit/);
assert.match(deposit, /activated: false/);
assert.match(deposit, /pending: true/);

assert.match(credit, /\.eq\("spent_budget", spent\)/);
assert.match(credit, /revertBudget/);
assert.match(credit, /casCreditCreatorBalances/);
assert.match(credit, /\.eq\("available_balance", infAvail\)/);
assert.match(credit, /\.eq\("available_balance", wAvail\)/);
assert.match(credit, /\.delete\(\)\.eq\("id", ugcPay\.id\)/);
assert.doesNotMatch(credit, /UNIQUE.*submission_id/);

assert.match(flwWebhook, /confirmUgcEscrowFromProviderEvent/);
assert.match(flwWebhook, /status: 401/);
assert.match(nowpWebhook, /confirmUgcEscrowPayment/);
assert.match(nowpWebhook, /status: 401/);
assert.doesNotMatch(nowpWebhook, /Invalid signature[\s\S]*status: 400/);

assert.match(invitationsId, /creators\.invite/);
assert.doesNotMatch(invitationsId, /BRAND_STATUSES\.has\(status\) && !isBrand/);

assert.match(insights, /showEarnings/);
assert.match(insights, /order\("display_name"/);
assert.doesNotMatch(
  insights,
  /\.order\("total_earnings"[\s\S]*showEarnings = Boolean/,
);

assert.match(submitPage, /t\("submitUrlHint"\)/);
assert.doesNotMatch(submitPage, /Facebook/);

assert.match(confirm, /paidAmountCoversEscrow/);
assert.match(confirm, /MIN_FUNDING_RWF/);
assert.doesNotMatch(confirm, /void MIN_FUNDING_RWF/);

assert.match(disputes, /Only brand\/admin can resolve/);
assert.match(disputes, /disputes\.manage/);
assert.match(disputeMsgs, /isDecision/);
assert.match(disputeMsgs, /disputes\.manage/);

assert.match(crmPost, /creators\.invite/);
assert.match(favorites, /creators\.invite/);
assert.match(deliveries, /webhooks\.manage/);

assert.match(workflowRun, /completed_with_skipped/);
assert.match(workflowRun, /status: "completed"/);
assert.match(schema, /CHECK \(status IN \('running', 'completed', 'failed', 'cancelled'\)\)/);
assert.doesNotMatch(vercel, /ugc\/workflows/);

assert.match(layout, /UGC_LOCALE_COOKIE/);
assert.match(layout, /lang=\{lang\}/);
assert.match(locale, /UGC_LOCALE_COOKIE/);

assert.match(card, /t\("joinCampaign"\)/);
assert.match(wizard, /t\("wizardTitle"\)/);
assert.match(permissions, /viewer: new Set\(\["finance\.view"\]\)/);

assert.doesNotMatch(payoutsSchema, /UNIQUE \(submission_id\)/);
assert.match(payoutsSchema, /idx_ugc_payouts_sub_id/);

const amount = await loadEscrowAmount();
assert.equal(
  amount.paidAmountCoversEscrow({
    expected: 1000,
    escrowCurrency: "RWF",
    paidAmount: 1000,
    paidCurrency: "RWF",
  }),
  true,
);
assert.equal(
  amount.paidAmountCoversEscrow({
    expected: 1000,
    escrowCurrency: "RWF",
    paidAmount: 500,
    paidCurrency: "RWF",
  }),
  false,
);
assert.equal(
  amount.paidAmountCoversEscrow({
    expected: 1000,
    escrowCurrency: "RWF",
    paidAmount: 0.01,
    paidCurrency: "USD",
  }),
  false,
);
assert.equal(
  amount.paidAmountCoversEscrow({
    expected: 1000,
    escrowCurrency: "RWF",
    paidAmount: 0.8,
    paidCurrency: "USD",
    invoiceAmount: 0.8,
    invoiceCurrency: "USD",
  }),
  true,
);
assert.equal(
  amount.paidAmountCoversEscrow({
    expected: 1000,
    escrowCurrency: "RWF",
    paidAmount: 0.1,
    paidCurrency: "USD",
    invoiceAmount: 0.8,
    invoiceCurrency: "USD",
  }),
  false,
);
assert.equal(
  amount.paidAmountCoversEscrow({
    expected: 1000,
    escrowCurrency: "RWF",
    paidAmount: 50,
    paidCurrency: "EUR",
  }),
  false,
);

const i18n = await loadTs("lib/ugc/i18n/messages.ts");
assert.notEqual(i18n.ugcMessage("en", "joinCampaign"), i18n.ugcMessage("fr", "joinCampaign"));
assert.ok(i18n.ugcMessage("rw", "approveAction").length > 0);
assert.ok(i18n.ugcMessage("en", "submitUrlHint").includes("TikTok"));
assert.doesNotMatch(i18n.ugcMessage("en", "submitUrlHint"), /Facebook/);
assert.notEqual(i18n.ugcMessage("en", "submitUrlHint"), i18n.ugcMessage("fr", "submitUrlHint"));
assert.equal(i18n.normalizeUgcLocale("fr-FR"), "fr");
assert.equal(i18n.UGC_LOCALE_COOKIE, "jimvio-ugc-locale");

const permMod = await loadTs("lib/ugc/enterprise/permissions.ts");
assert.equal(permMod.roleCan("viewer", "finance.view"), true);
assert.equal(permMod.roleCan("viewer", "creators.invite"), false);
assert.equal(permMod.roleCan("viewer", "disputes.manage"), false);
assert.equal(permMod.roleCan("viewer", "webhooks.manage"), false);
assert.equal(permMod.roleCan("manager", "finance.payout"), false);
assert.equal(permMod.roleCan("finance", "campaigns.manage"), false);

console.log("verify-ugc-production-acceptance: ok");
