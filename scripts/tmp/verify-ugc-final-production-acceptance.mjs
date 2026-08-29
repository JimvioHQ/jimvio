/**
 * Final UGC production-acceptance verifier.
 * Uses real helpers (wizard, RBAC, escrow amount, identity completion,
 * webhook HMAC, creditFixedPayoutIfNeeded, emitUgcWebhook) plus source
 * assertions. Does not invent a second money/auth engine.
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

async function loadTs(rel, rewrite = []) {
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
  let js = outputText;
  for (const [from, to] of rewrite) js = js.replace(from, to);
  const out = path.join(
    os.tmpdir(),
    `${path.basename(rel, ".ts")}-final-prod-${process.pid}-${Math.random().toString(16).slice(2)}.mjs`,
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
  const moneyOut = path.join(os.tmpdir(), `money-final-prod-${process.pid}.mjs`);
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
  const out = path.join(os.tmpdir(), `escrow-amount-final-prod-${process.pid}.mjs`);
  fs.writeFileSync(out, rewritten);
  return import(pathToFileURL(out).href);
}

function createMemDb(seed, opts = {}) {
  const tables = structuredClone(seed);
  let gate = Promise.resolve();
  function matches(row, filters) {
    return filters.every(([k, v]) => Object.is(row[k], v) || row[k] === v);
  }
  return {
    _tables: tables,
    from(table) {
      const filters = [];
      let op = "select";
      let patch = null;
      let insertRow = null;
      let limitN = null;
      let orderKey = null;
      let orderAsc = true;
      const builder = {
        select() {
          return builder;
        },
        insert(row) {
          op = "insert";
          insertRow = { ...row };
          return builder;
        },
        update(p) {
          op = "update";
          patch = { ...p };
          return builder;
        },
        delete() {
          op = "delete";
          return builder;
        },
        eq(k, v) {
          filters.push([k, v]);
          return builder;
        },
        limit(n) {
          limitN = n;
          return builder;
        },
        order(k, o) {
          orderKey = k;
          orderAsc = o?.ascending !== false;
          return builder;
        },
        maybeSingle() {
          return run(true);
        },
        single() {
          return run(true);
        },
        then(resolve, reject) {
          return run(false).then(resolve, reject);
        },
      };
      async function run(single) {
        const wait = gate;
        let release;
        gate = new Promise((r) => {
          release = r;
        });
        await wait;
        try {
          if (!tables[table]) tables[table] = [];
          const rows = tables[table];
          if (op === "select") {
            let found = rows.filter((r) => matches(r, filters));
            if (orderKey) {
              found = [...found].sort((a, b) => {
                const av = a[orderKey];
                const bv = b[orderKey];
                if (av === bv) return 0;
                const cmp = av > bv ? 1 : -1;
                return orderAsc ? cmp : -cmp;
              });
            }
            if (limitN != null) found = found.slice(0, limitN);
            return { data: single ? (found[0] ?? null) : found, error: null };
          }
          if (op === "update") {
            if (opts.failWalletCas && table === "wallets") {
              return { data: single ? null : [], error: null };
            }
            const found = rows.filter((r) => matches(r, filters));
            if (!found.length) return { data: single ? null : [], error: null };
            Object.assign(found[0], patch);
            return { data: single ? found[0] : found, error: null };
          }
          if (op === "insert") {
            const row = {
              id: insertRow.id ?? `row-${table}-${rows.length + 1}`,
              created_at: insertRow.created_at ?? new Date().toISOString(),
              ...insertRow,
            };
            rows.push(row);
            return { data: single ? row : [row], error: null };
          }
          if (op === "delete") {
            tables[table] = rows.filter((r) => !matches(r, filters));
            return { data: null, error: null };
          }
          return { data: null, error: null };
        } finally {
          release();
        }
      }
      return builder;
    },
  };
}

function seedMoney(overrides = {}) {
  return {
    ugc_campaigns: [
      {
        id: "camp-1",
        payment_model: "fixed_per_content",
        fixed_rate: 50,
        spent_budget: 0,
        approved_count: 0,
        total_budget: 100,
        ...overrides.campaign,
      },
    ],
    ugc_payouts: [...(overrides.payouts ?? [])],
    influencers: [
      {
        id: "inf-1",
        user_id: "user-1",
        total_earnings: 0,
        available_balance: 10,
      },
    ],
    wallets: [
      {
        user_id: "user-1",
        available_balance: 20,
        total_earned: 0,
      },
    ],
    ugc_submissions: [{ id: "sub-1", total_earnings: 0 }],
    payouts: [],
    notifications: [],
  };
}

const eligibility = read("app/api/ugc/campaigns/[id]/eligibility/route.ts");
const participant = read("app/api/ugc/campaigns/[id]/participant/route.ts");
const activity = read("app/api/ugc/campaigns/[id]/activity/route.ts");
const brandAccess = read("lib/ugc/enterprise/brand-access.ts");
const deposit = read("app/api/ugc/campaigns/[id]/deposit/route.ts");
const confirm = read("lib/ugc/confirm-escrow-payment.ts");
const approve = read("app/api/ugc/submissions/[id]/approve/route.ts");
const credit = read("lib/ugc/credit-fixed-payout.ts");
const notes = read("app/api/ugc/notes/route.ts");
const referrals = read("app/api/ugc/referrals/route.ts");
const insights = read("app/api/ugc/insights/route.ts");
const campaigns = read("app/api/ugc/campaigns/route.ts");
const nowp = read("app/api/webhooks/nowpayments/route.ts");
const nowpIpn = read("app/api/nowpayments/ipn/route.ts");
const nowpPay = read("app/api/payments/nowpayments/route.ts");
const nowpLib = read("lib/nowpayments.ts");
const flw = read("app/api/payments/flutterwave/webhook/route.ts");
const flwLib = read("lib/flutterwave.ts");
const unified = read("app/api/webhooks/payment/route.ts");
const verifiers = read("lib/payments/provider-verifiers.ts");
const identityUpdate = read("app/api/identity/update/route.ts");
const identitySync = read("lib/identity/sync.ts");
const inviteCancel = read("app/api/ugc/invitations/[id]/route.ts");
const reputation = read("app/api/ugc/reputation/creator/[id]/route.ts");
const teamRoute = read("app/api/ugc/team/route.ts");
const fund = read("components/ugc/campaign-center/CampaignFundClient.tsx");
const joinFlow = read("components/ugc/join/CampaignJoinFlow.tsx");
const wizardUi = read("components/ugc/campaign-center/CampaignCreateWizard.tsx");
const shell = read("components/ugc/workspace/UGCWorkspaceShell.tsx");
const applications = read("components/ugc/workspace/UGCApplicationsPage.tsx");
const nextConfig = read("next.config.ts");
const workflowRun = read("app/api/ugc/workflows/[id]/run/route.ts");
const vercel = read("vercel.json");
const payoutsSchema = read("database/migrations/00.sql");
const webhooksSrc = read("lib/ugc/enterprise/webhooks.ts");
const wizardSrc = read("lib/ugc/campaign-wizard-validation.ts");

assert.match(brandAccess, /canAccessCampaignJoinSurfaces/);
assert.match(eligibility, /canAccessCampaignJoinSurfaces/);
assert.match(participant, /canAccessCampaignJoinSurfaces/);
assert.match(activity, /scopeRows/);
assert.match(activity, /influencer_id === mine/);

assert.match(nextConfig, /X-Content-Type-Options/);
assert.match(nextConfig, /nosniff/);
assert.match(nextConfig, /Referrer-Policy/);
assert.match(nextConfig, /strict-origin-when-cross-origin/);
assert.match(nextConfig, /X-Frame-Options/);
assert.match(nextConfig, /SAMEORIGIN/);
assert.match(nextConfig, /frame-ancestors 'self'/);

assert.match(deposit, /assertCampaignReadyForFunding/);
assert.match(deposit, /\.eq\("available_balance", available\)/);
assert.match(deposit, /refundWalletDebit/);
assert.match(deposit, /activated: false/);
assert.match(confirm, /paidAmountCoversEscrow/);
assert.match(confirm, /assertCampaignReadyForFunding/);
assert.match(fund, /Boolean\(json.activated\)/);
assert.doesNotMatch(fund, /json.activated \|\| json.already_funded/);
assert.match(fund, /htmlFor="ugc-fund-phone"/);
assert.match(fund, /role="alert"/);
assert.match(fund, /aria-pressed/);
assert.match(fund, /min-w-0/);

assert.match(nowpLib, /export function getNowPaymentsIpnSecret/);
assert.match(nowpLib, /if \(!secret \|\| !receivedSignature\) return false/);
assert.doesNotMatch(nowpLib, /createHmac\('sha512', process\.env\.NOWPAYMENTS_IPN_SECRET!\)/);
assert.match(nowp, /getNowPaymentsIpnSecret/);
assert.match(nowp, /NOWPAYMENTS_IPN_SECRET not configured/);
assert.match(nowp, /status: 500/);
assert.match(nowp, /status: 401/);
assert.match(nowp, /confirmUgcEscrowPayment/);
assert.match(nowpIpn, /getNowPaymentsIpnSecret/);
assert.match(nowpIpn, /confirmUgcEscrowPayment/);
assert.match(nowpIpn, /status: 500/);
assert.match(nowpIpn, /status: 401/);
assert.match(nowpPay, /getNowPaymentsIpnSecret/);
assert.match(nowpPay, /NOWPAYMENTS_IPN_SECRET not configured/);
assert.match(nowpPay, /status: 500/);
assert.match(nowpPay, /status: 401/);
assert.match(nowpPay, /confirmUgcEscrowPayment/);
assert.match(flw, /flutterwaveWebhookSecretConfigured/);
assert.match(flw, /confirmUgcEscrowFromProviderEvent/);
assert.match(flw, /status: 500/);
assert.match(flw, /status: 401/);
assert.match(flwLib, /export function flutterwaveWebhookSecretConfigured/);
assert.match(verifiers, /flutterwaveWebhookSecretConfigured/);
assert.match(verifiers, /getNowPaymentsIpnSecret/);
assert.doesNotMatch(verifiers, /flw-noop-\$\{Date\.now\(\)\}/);
assert.match(unified, /confirmUgcEscrowFromProviderEvent/);
assert.match(unified, /isDuplicate/);
assert.match(identityUpdate, /profile-update-zero-rows/);
assert.match(identityUpdate, /ensureInfluencerMirror/);
assert.match(identitySync, /update-zero-rows/);
assert.match(identitySync, /reason: "incomplete"/);
assert.match(inviteCancel, /creators\.invite/);
assert.match(reputation, /total_earnings: null/);
assert.match(reputation, /function publicCreator/);
assert.doesNotMatch(reputation, /return \{\s*id: influencer\.id,\s*user_id/);
assert.match(teamRoute, /team\.manage/);
assert.match(applications, /t\("withdrawFailed"\)/);

assert.match(approve, /\.in\('status', REVIEWABLE\)/);
assert.match(credit, /racedRows/);
assert.match(credit, /siblings/);
assert.doesNotMatch(payoutsSchema, /UNIQUE \(submission_id\)/);

assert.match(notes, /\.eq\("author_user_id", user\.id\)/);
assert.match(notes, /requireCampaignPermission/);
assert.match(notes, /campaigns\.review/);

const submissionsList = read("app/api/ugc/submissions/route.ts");
const submissionGet = read("app/api/ugc/submissions/[id]/route.ts");
const aiReview = read("app/api/ugc/ai/review/route.ts");
const workflowsList = read("app/api/ugc/workflows/route.ts");
const library = read("app/api/ugc/library/route.ts");
const brandCreatorSearch = read("app/api/ugc/brand/creators/search/route.ts");
const envVerify = read("scripts/release/verify-env.mjs");
assert.match(submissionsList, /filterBrandIdsByPermission/);
assert.match(submissionsList, /campaigns\.review/);
assert.match(submissionGet, /memberCan\(role, 'campaigns\.review'\)/);
assert.match(aiReview, /canReadCampaign/);
assert.match(workflowsList, /automations\.manage/);
assert.match(library, /creatorProfileRequiredPayload/);
assert.match(brandCreatorSearch, /creators\.invite/);
assert.doesNotMatch(brandCreatorSearch, /userId: String\(inf\.user_id\)/);
assert.match(nowpLib, /status === 'finished' \|\| status === 'confirmed'/);
assert.match(nowpIpn, /logWebhookEvent/);
assert.match(envVerify, /NOWPAYMENTS_IPN_SECRET/);
assert.match(envVerify, /FLW_WEBHOOK_SECRET/);
assert.doesNotMatch(referrals, /body\.reward_amount/);
assert.match(referrals, /reward_amount: 5/);
assert.match(insights, /showEarnings/);
assert.match(campaigns, /query = query\.eq\('status', 'active'\)/);
assert.doesNotMatch(wizardSrc, /facebook/);

assert.match(workflowRun, /completed_with_skipped/);
assert.doesNotMatch(workflowRun, /setTimeout/);
assert.doesNotMatch(vercel, /ugc\/workflows/);

assert.match(webhooksSrc, /createHmac\("sha256"/);
assert.match(webhooksSrc, /X-Jimvio-Signature/);
assert.doesNotMatch(webhooksSrc, /"X-Jimvio-Signature": sub\.secret/);
assert.match(webhooksSrc, /idempotency_key/);
assert.match(webhooksSrc, /23505/);

assert.match(shell, /min-w-0/);
assert.match(shell, /Escape/);
assert.match(wizardUi, /overflow-x-auto/);
assert.match(wizardUi, /min-w-0/);
assert.match(applications, /overflow-x-auto/);
assert.match(joinFlow, /t\("notEligible"\)/);
assert.match(joinFlow, /t\("youreIn"\)/);
assert.match(joinFlow, /t\("confirmJoin"\)/);
assert.match(joinFlow, /role="dialog"/);
assert.match(joinFlow, /Escape/);
assert.match(applications, /t\("createCreatorProfile"\)/);
assert.match(applications, /t\("noApplicationsUnlockDesc"\)/);
assert.match(applications, /href="\/identity\/edit"/);
assert.match(applications, /overflow-x-auto/);
const sidebar = read("components/ugc/workspace/UGCWorkspaceSidebar.tsx");
assert.match(sidebar, /href: "\/identity\/edit"/);
assert.match(sidebar, /pathname\.startsWith\("\/identity"\)/);
assert.match(fund, /t\("insufficientWalletEscrow"\)/);

const wizard = await loadTs("lib/ugc/campaign-wizard-validation.ts");
assert.equal(
  wizard.assertCampaignReadyForFunding({
    title: "x",
    campaign_type: "ugc",
    payment_model: "per_views",
    total_budget: 1000,
    rate_per_1k_views: 1,
    allowed_platforms: ["tiktok"],
  }).success,
  false,
);
assert.equal(
  wizard.validateCampaignStep("requirements", {
    title: "Ready",
    campaign_type: "ugc",
    payment_model: "fixed_per_content",
    total_budget: 5000,
    fixed_rate: 50,
    allowed_platforms: ["tiktok"],
  }).success,
  false,
  "empty requirements block Continue",
);
assert.equal(
  wizard.isCampaignStepComplete({ title: "Visited only" }, "rewards"),
  false,
  "visited step is not completion",
);
assert.equal(
  wizard.assertCampaignReadyForFunding({
    id: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
    title: "Draft only",
  }).success,
  false,
  "draft ID is not completion",
);
assert.equal(
  wizard.validateCampaignStep("targeting", { allowed_platforms: ["facebook"] }).success,
  false,
);
assert.equal(
  wizard.assertCampaignReadyForFunding({
    title: "Ready",
    campaign_type: "ugc",
    payment_model: "fixed_per_content",
    total_budget: 5000,
    fixed_rate: 50,
    allowed_platforms: ["tiktok"],
    min_duration: 10,
    max_duration: 60,
  }).success,
  true,
);

const perms = await loadTs("lib/ugc/enterprise/permissions.ts");
assert.equal(perms.roleCan("owner", "team.manage"), true);
assert.equal(perms.roleCan("manager", "finance.payout"), false);
assert.equal(perms.roleCan("manager", "team.manage"), false);
assert.equal(perms.roleCan("reviewer", "finance.payout"), false);
assert.equal(perms.roleCan("reviewer", "campaigns.manage"), false);
assert.equal(perms.roleCan("reviewer", "campaigns.review"), true);
assert.equal(perms.roleCan("reviewer", "team.manage"), false);
assert.equal(perms.roleCan("finance", "campaigns.manage"), false);
assert.equal(perms.roleCan("finance", "team.manage"), false);
assert.equal(perms.roleCan("finance", "finance.payout"), true);
assert.equal(perms.roleCan("viewer", "finance.view"), true);
assert.equal(perms.roleCan("viewer", "campaigns.manage"), false);
assert.equal(perms.roleCan("viewer", "finance.payout"), false);
assert.equal(perms.roleCan("viewer", "team.manage"), false);
assert.equal(perms.roleCan("viewer", "creators.invite"), false);
assert.equal(typeof perms.filterBrandIdsByPermission, "function");

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

const identity = await loadTs("lib/identity/creator-profile-completion.ts");
assert.equal(identity.evaluateCreatorProfileCompletion({}).complete, false);
assert.equal(
  identity.evaluateCreatorProfileCompletion({
    fullName: "Ada",
    headline: "Creator",
    bio: "Hello",
  }).complete,
  true,
);
assert.equal(
  identity.isCreatorWorkspaceReady(
    identity.evaluateCreatorProfileCompletion({
      fullName: "Ada",
      headline: "Creator",
      bio: "Hello",
    }),
    null,
  ),
  false,
);
assert.equal(
  identity.isCreatorWorkspaceReady(
    identity.evaluateCreatorProfileCompletion({
      fullName: "Ada",
      headline: "Creator",
      bio: "Hello",
    }),
    { id: "inf-1" },
  ),
  true,
);

const i18n = await loadTs("lib/ugc/i18n/messages.ts");
assert.notEqual(i18n.ugcMessage("en", "fundCampaign"), i18n.ugcMessage("fr", "fundCampaign"));
assert.ok(i18n.ugcMessage("rw", "insufficientWalletEscrow").length > 0);
assert.ok(i18n.ugcMessage("en", "notEligible").includes("eligible"));
assert.ok(i18n.ugcMessage("en", "withdrawFailed").length > 0);
assert.notEqual(i18n.ugcMessage("en", "withdrawFailed"), i18n.ugcMessage("fr", "withdrawFailed"));
assert.doesNotMatch(i18n.ugcMessage("en", "submitUrlHint"), /Facebook/);

const nowpMod = await loadTs("lib/nowpayments.ts");
const prevIpn = process.env.NOWPAYMENTS_IPN_SECRET;
delete process.env.NOWPAYMENTS_IPN_SECRET;
assert.equal(nowpMod.getNowPaymentsIpnSecret(), null);
assert.equal(nowpMod.verifyNowPaymentsSignature(JSON.stringify({ a: 1 }), "00"), false);
process.env.NOWPAYMENTS_IPN_SECRET = "test-ipn-secret-not-production";
assert.equal(nowpMod.getNowPaymentsIpnSecret(), "test-ipn-secret-not-production");
assert.equal(nowpMod.verifyNowPaymentsSignature(JSON.stringify({ a: 1 }), "00"), false);
const { createHmac } = await import("node:crypto");
const validSig = createHmac("sha512", "test-ipn-secret-not-production")
  .update(JSON.stringify({ a: 1 }))
  .digest("hex");
assert.equal(nowpMod.verifyNowPaymentsSignature(JSON.stringify({ a: 1 }), validSig), true);
if (prevIpn == null) delete process.env.NOWPAYMENTS_IPN_SECRET;
else process.env.NOWPAYMENTS_IPN_SECRET = prevIpn;

const creditMod = await loadTs("lib/ugc/credit-fixed-payout.ts");

{
  const db = createMemDb(seedMoney());
  const first = await creditMod.creditFixedPayoutIfNeeded(db, {
    submissionId: "sub-1",
    campaignId: "camp-1",
    influencerId: "inf-1",
  });
  assert.equal(first.ok, true);
  assert.equal(first.credited, true);
  assert.equal(first.amount, 50);
  assert.equal(db._tables.ugc_campaigns[0].spent_budget, 50);
  assert.equal(db._tables.ugc_payouts.length, 1);
  assert.equal(db._tables.influencers[0].available_balance, 60);
  assert.equal(db._tables.wallets[0].available_balance, 70);

  const second = await creditMod.creditFixedPayoutIfNeeded(db, {
    submissionId: "sub-1",
    campaignId: "camp-1",
    influencerId: "inf-1",
  });
  assert.equal(second.ok, true);
  assert.equal(second.credited, false);
  assert.equal(db._tables.ugc_payouts.length, 1);
  assert.equal(db._tables.ugc_campaigns[0].spent_budget, 50);
}

{
  const db = createMemDb(
    seedMoney({ campaign: { spent_budget: 80, total_budget: 100, approved_count: 1 } }),
  );
  const over = await creditMod.creditFixedPayoutIfNeeded(db, {
    submissionId: "sub-2",
    campaignId: "camp-1",
    influencerId: "inf-1",
  });
  assert.equal(over.ok, false);
  assert.equal(over.status, 409);
  assert.equal(db._tables.ugc_payouts.length, 0);
  assert.equal(db._tables.ugc_campaigns[0].spent_budget, 80);
}

{
  const db = createMemDb(seedMoney(), { failWalletCas: true });
  const failed = await creditMod.creditFixedPayoutIfNeeded(db, {
    submissionId: "sub-1",
    campaignId: "camp-1",
    influencerId: "inf-1",
  });
  assert.equal(failed.ok, false);
  assert.equal(failed.status, 409);
  assert.equal(db._tables.ugc_payouts.length, 0);
  assert.equal(db._tables.ugc_campaigns[0].spent_budget, 0);
  assert.equal(db._tables.influencers[0].available_balance, 10);
}

{
  const db = createMemDb(seedMoney());
  const [a, b] = await Promise.all([
    creditMod.creditFixedPayoutIfNeeded(db, {
      submissionId: "sub-a",
      campaignId: "camp-1",
      influencerId: "inf-1",
    }),
    creditMod.creditFixedPayoutIfNeeded(db, {
      submissionId: "sub-b",
      campaignId: "camp-1",
      influencerId: "inf-1",
    }),
  ]);
  const wins = [a, b].filter((r) => r.ok && r.credited);
  const rejects = [a, b].filter((r) => !r.ok);
  assert.equal(wins.length, 1, "exactly one concurrent budget CAS credit");
  assert.equal(rejects.length, 1);
  assert.equal(db._tables.ugc_payouts.length, 1);
  assert.equal(db._tables.ugc_campaigns[0].spent_budget, 50);
}

const hookMod = await loadTs("lib/ugc/enterprise/webhooks.ts");
const body = JSON.stringify({ event: "submission.approved", data: { submissionId: "abc" } });
const sig = hookMod.signUgcWebhookBody("secret", body);
assert.equal(sig.length, 64);
assert.equal(hookMod.signUgcWebhookBody("secret", body), sig);
assert.notEqual(hookMod.signUgcWebhookBody("other", body), sig);
assert.equal(body.includes("secret"), false);

{
  const deliveries = [];
  const hookDb = {
    from(table) {
      if (table === "ugc_webhook_subscriptions") {
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          then(resolve) {
            return resolve({
              data: [
                {
                  id: "sub-1",
                  url: "https://example.test/hook",
                  secret: "hook-secret",
                  events: ["*"],
                  is_active: true,
                },
              ],
            });
          },
        };
      }
      if (table === "ugc_webhook_deliveries") {
        const filters = {};
        let op = "select";
        let insertRow = null;
        const builder = {
          select() {
            return builder;
          },
          insert(row) {
            op = "insert";
            insertRow = row;
            return builder;
          },
          update() {
            op = "update";
            return builder;
          },
          eq(k, v) {
            filters[k] = v;
            return builder;
          },
          maybeSingle() {
            if (op === "select") {
              const hit = deliveries.find((d) => d.idempotency_key === filters.idempotency_key);
              return Promise.resolve({ data: hit ?? null });
            }
            return Promise.resolve({ data: null });
          },
          single() {
            if (op === "insert") {
              if (deliveries.some((d) => d.idempotency_key === insertRow.idempotency_key)) {
                return Promise.resolve({ data: null, error: { code: "23505" } });
              }
              const row = { id: `del-${deliveries.length + 1}`, ...insertRow };
              deliveries.push(row);
              return Promise.resolve({ data: row, error: null });
            }
            return Promise.resolve({ data: null, error: null });
          },
          then(resolve, reject) {
            return Promise.resolve({ data: null, error: null }).then(resolve, reject);
          },
        };
        return builder;
      }
      throw new Error(`unexpected table ${table}`);
    },
  };

  const originalFetch = globalThis.fetch;
  let fetchCount = 0;
  globalThis.fetch = async () => {
    fetchCount += 1;
    return { ok: true, status: 200 };
  };
  try {
    await hookMod.emitUgcWebhook(hookDb, "brand-1", "submission.approved", {
      submissionId: "abc",
    });
    await hookMod.emitUgcWebhook(hookDb, "brand-1", "submission.approved", {
      submissionId: "abc",
    });
    await hookMod.emitUgcWebhook(hookDb, "brand-1", "submission.approved", {
      submissionId: "xyz",
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
  assert.equal(deliveries.length, 2);
  assert.equal(fetchCount, 2);
  assert.equal(deliveries[0].payload.event, "submission.approved");
  assert.equal(JSON.stringify(deliveries[0].payload).includes("hook-secret"), false);
}

console.log("verify-ugc-final-production-acceptance: ok");
