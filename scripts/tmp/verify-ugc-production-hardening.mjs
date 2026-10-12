/**
 * UGC production hardening: money, auth, funding honesty, submit/revision.
 * Auto-picked up by npm test via scripts/tmp/verify-*.mjs
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
  const out = path.join(os.tmpdir(), `${path.basename(rel, ".ts")}-${process.pid}.mjs`);
  fs.writeFileSync(out, outputText);
  try {
    return await import(pathToFileURL(out).href + `?t=${Date.now()}`);
  } finally {
    try {
      fs.unlinkSync(out);
    } catch {
      /* ignore */
    }
  }
}

const approve = read("app/api/ugc/submissions/[id]/approve/route.ts");
const patchSub = read("app/api/ugc/submissions/[id]/route.ts");
const listSub = read("app/api/ugc/submissions/route.ts");
const reject = read("app/api/ugc/submissions/[id]/reject/route.ts");
const credit = read("lib/ugc/credit-fixed-payout.ts");
const deposit = read("app/api/ugc/campaigns/[id]/deposit/route.ts");
const fund = read("components/ugc/campaign-center/CampaignFundClient.tsx");
const createApi = read("app/api/ugc/campaigns/route.ts");
const webhooks = read("lib/ugc/enterprise/webhooks.ts");
const submitPage = read("app/ugc/[id]/submit/page.tsx");
const submissionsPage = read("components/ugc/workspace/UGCSubmissionsPage.tsx");
const applicationsPage = read("components/ugc/workspace/UGCApplicationsPage.tsx");
const joinEngine = read("lib/ugc/join-engine.ts");
const detail = read("lib/ugc/campaign-detail.ts");
const syncViews = read("lib/ugc/syncViews.ts");
const insights = read("app/api/ugc/insights/route.ts");
const revision = read("app/api/ugc/submissions/[id]/revision/route.ts");

assert.match(credit, /export async function creditFixedPayoutIfNeeded/);
assert.match(credit, /ugc_payouts/);
assert.match(credit, /Campaign budget is exhausted/);
assert.match(credit, /23505/);
assert.match(approve, /creditFixedPayoutIfNeeded/);
assert.match(approve, /\.in\('status', REVIEWABLE\)/);
assert.match(patchSub, /creditFixedPayoutIfNeeded/);
assert.match(patchSub, /assertCanReadSubmission/);
assert.match(patchSub, /Approved submissions cannot be changed/);
assert.match(listSub, /listAccessibleBrandIds/);
assert.match(listSub, /isUgcSubmitPlatform/);
assert.match(listSub, /normalizePostUrl/);
assert.match(reject, /Approved submissions cannot be rejected/);
assert.match(reject, /\.in\('status', \['pending', 'revision_requested'\]\)/);

assert.match(deposit, /assertCampaignReadyForFunding/);
assert.match(deposit, /MIN_FUNDING_USD = 1/);
assert.match(deposit, /payment_method === "wallet"/);
assert.match(deposit, /ensureWallet/);
assert.match(deposit, /23505/);
assert.match(deposit, /activated: true/);
assert.match(deposit, /pending: true/);
assert.match(deposit, /Insufficient wallet balance/);
assert.match(deposit, /\.eq\("available_balance", available\)/);

assert.match(fund, /Boolean\(json.activated\)/);
assert.doesNotMatch(fund, /json.activated \|\| json.already_funded/);
assert.match(fund, /setOutcome\("pending"\)/);
assert.match(fund, /\/api\/identity\/wallet/);
assert.doesNotMatch(fund, /phone \|\| "250700000000"/);
assert.match(fund, /t\("insufficientWalletEscrow"\)/);

assert.match(createApi, /fixed_rate must be > 0/);
assert.match(createApi, /model === 'fixed_per_content'/);

assert.match(webhooks, /createHmac/);
assert.match(webhooks, /X-Jimvio-Signature/);
assert.doesNotMatch(webhooks, /Date\.now\(\)/);
assert.doesNotMatch(webhooks, /"X-Jimvio-Signature": sub\.secret/);

assert.match(submitPage, /facebook/);
assert.match(submissionsPage, /revision_requested/);
assert.match(submissionsPage, /\/api\/ugc\/submissions\/\$\{submissionId\}\/revision/);
assert.doesNotMatch(submissionsPage, /Facebook, and X/);
assert.match(applicationsPage, /application\/withdraw/);
assert.match(joinEngine, /profile\?\.totalFollowers \?\? 0/);
assert.match(detail, /id: "min_followers"/);
assert.doesNotMatch(syncViews, /from\('ugc_payouts'\)\.insert/);
assert.match(syncViews, /syncedViewsMayCreateReward/);
assert.match(insights, /showEarnings/);
assert.match(revision, /status !== "revision_requested"/);

const urlMod = await loadTs("lib/ugc/normalize-post-url.ts");
assert.equal(urlMod.isUgcSubmitPlatform("facebook"), true);
assert.equal(urlMod.isUgcSubmitPlatform("tiktok"), true);
assert.equal(
  urlMod.normalizePostUrl("https://www.tiktok.com/@u/video/1/?utm_source=x#frag"),
  "https://tiktok.com/@u/video/1",
);

const hookMod = await loadTs("lib/ugc/enterprise/webhooks.ts");
const body = JSON.stringify({ event: "submission.approved", data: { submissionId: "abc" } });
const sig = hookMod.signUgcWebhookBody("secret", body);
assert.equal(typeof sig, "string");
assert.equal(sig.length, 64);
assert.equal(hookMod.signUgcWebhookBody("secret", body), sig);
assert.notEqual(hookMod.signUgcWebhookBody("other", body), sig);

console.log("verify-ugc-production-hardening: ok");
