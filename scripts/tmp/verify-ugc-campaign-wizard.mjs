/**
 * UGC campaign wizard: step completion is data-valid, not visited.
 * Loads the real canonical validator (not a duplicate copy).
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

const validationSrc = read("lib/ugc/campaign-wizard-validation.ts");
const wizard = read("components/ugc/campaign-center/CampaignCreateWizard.tsx");
const createApi = read("app/api/ugc/campaigns/route.ts");
const patchApi = read("app/api/ugc/campaigns/[id]/route.ts");
const depositApi = read("app/api/ugc/campaigns/[id]/deposit/route.ts");
const fundClient = read("components/ugc/campaign-center/CampaignFundClient.tsx");
const duplicate = read("lib/ugc/platform/duplicate-campaign.ts");
const templates = read("app/api/ugc/templates/[id]/route.ts");
const copilotPage = read("components/ugc/enterprise/CampaignCopilotPage.tsx");
const copilotLib = read("lib/ugc/enterprise/campaign-copilot.ts");

assert.match(validationSrc, /export function isCampaignStepComplete/);
assert.match(validationSrc, /export function validateCampaignStep/);
assert.match(validationSrc, /export function validateCampaignWizardReady/);
assert.match(validationSrc, /export function assertCampaignReadyForFunding/);
assert.match(validationSrc, /export function canOpenCampaignWizardStep/);
assert.match(validationSrc, /export function campaignWizardProgressPercent/);
assert.match(validationSrc, /min_duration/);
assert.match(validationSrc, /Maximum duration must be greater than or equal to minimum duration/);
assert.match(validationSrc, /Campaign title is required/);
assert.match(validationSrc, /Budget must be greater than 0/);
assert.match(validationSrc, /Select at least one platform/);
assert.match(validationSrc, /Minimum duration is required/);
assert.match(validationSrc, /Maximum duration is required/);
assert.match(
  validationSrc.slice(validationSrc.indexOf('if (step === "requirements")'), validationSrc.indexOf('if (step === "assets")')),
  /min_duration/,
);
assert.doesNotMatch(
  validationSrc.slice(validationSrc.indexOf('if (step === "requirements")'), validationSrc.indexOf('if (step === "assets")')),
  /required_hashtags|required_mentions|required_keywords|requires_face/,
);

assert.match(wizard, /from "@\/lib\/ugc\/campaign-wizard-validation"/);
assert.match(wizard, /isCampaignStepComplete/);
assert.match(wizard, /validateCampaignStep\(step, form\)/);
assert.match(wizard, /validateCampaignWizardReady/);
assert.match(wizard, /canOpenCampaignWizardStep/);
assert.match(wizard, /campaignWizardProgressPercent/);
assert.match(wizard, /readyForFunding: true/);
assert.match(wizard, /serverDraftPatch\(\{ readyForFunding: true \}\)/);
assert.match(wizard, /label="Min duration \(sec\)" required/);
assert.match(wizard, /label="Max duration \(sec\)" required/);
assert.match(wizard, /Save Draft/);
assert.match(wizard, /validateCampaignStep\("basics", form\)/);
assert.match(wizard, /validateCampaignStep\("rewards", form\)/);
assert.match(wizard, /This campaign is not ready for funding/);
assert.doesNotMatch(wizard, /i < step \? <Check/);
assert.doesNotMatch(wizard, /onClick=\{\(\) => setStep\(i\)\}/);
assert.match(wizard, /if \(!canOpenCampaignWizardStep\(form, target\)\)/);
assert.match(wizard, /const result = validateCampaignStep\(step, form\);\s*if \(!result\.success\)/);

assert.match(createApi, /readyForFunding/);
assert.match(createApi, /assertCampaignReadyForFunding/);
assert.match(patchApi, /assertCampaignReadyForFunding/);
assert.match(patchApi, /campaignNeedsCompletenessGate/);
assert.match(patchApi, /readyForFunding: body.readyForFunding/);
assert.match(depositApi, /assertCampaignReadyForFunding/);
assert.match(depositApi, /campaign.status === "draft"/);
assert.match(fundClient, /assertCampaignReadyForFunding/);
assert.match(fundClient, /This campaign is not ready to fund/);

assert.match(duplicate, /status: "draft"/);
assert.doesNotMatch(duplicate, /status: "active"/);
assert.match(templates, /status: "draft"/);
assert.match(copilotPage, /localStorage.setItem\(DRAFT_KEY/);
assert.match(copilotPage, /\/ugc\/campaign-center\/create/);
assert.match(copilotLib, /draftForm/);
assert.doesNotMatch(copilotLib, /readyForFunding/);

async function loadCanonical() {
  const require = createRequire(import.meta.url);
  const ts = require("typescript");
  const src = validationSrc;
  const { outputText } = ts.transpileModule(src, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
    },
    fileName: "campaign-wizard-validation.ts",
  });
  const out = path.join(os.tmpdir(), `campaign-wizard-validation-${process.pid}.mjs`);
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

const v = await loadCanonical();
const {
  validateCampaignStep,
  isCampaignStepComplete,
  validateCampaignWizardReady,
  assertCampaignReadyForFunding,
  canOpenCampaignWizardStep,
  firstIncompleteCampaignStep,
  campaignWizardProgressPercent,
  campaignNeedsCompletenessGate,
  coerceFiniteNumber,
  toCampaignWizardDraft,
} = v;

const valid = {
  title: "Summer Glow",
  campaign_type: "ugc",
  payment_model: "per_views",
  rate_per_1k_views: 3,
  fixed_rate: 50,
  total_budget: 500,
  allowed_platforms: ["tiktok"],
  min_duration: 15,
  max_duration: 60,
  media: [],
};

function check(step, draft, expected, label) {
  const got = validateCampaignStep(step, draft).success;
  assert.equal(got, expected, label || `${step} expected ${expected}`);
}

// TYPE
check("type", { ...valid, campaign_type: "ugc" }, true, "TYPE valid ugc");
check("type", { ...valid, campaign_type: "clipping" }, true, "TYPE valid clipping");
check("type", { ...valid, campaign_type: "" }, false, "TYPE empty");
check("type", { ...valid, campaign_type: "not-a-type" }, false, "TYPE invalid");

// BASICS
check("basics", { ...valid, title: "" }, false, "BASICS missing title");
check("basics", { ...valid, title: "   " }, false, "BASICS whitespace title");
check("basics", { ...valid, title: "Summer Glow" }, true, "BASICS valid title");

// REWARDS
check("rewards", { ...valid, total_budget: null }, false, "REWARDS missing budget");
check("rewards", { ...valid, total_budget: 0 }, false, "REWARDS zero budget");
check("rewards", { ...valid, total_budget: -10 }, false, "REWARDS negative budget");
check("rewards", { ...valid, total_budget: Number.NaN }, false, "REWARDS NaN budget");
check("rewards", { ...valid, total_budget: Number.POSITIVE_INFINITY }, false, "REWARDS Infinity budget");
check("rewards", { ...valid, total_budget: 500 }, true, "REWARDS valid budget");
check("rewards", { ...valid, payment_model: "per_views", rate_per_1k_views: null }, false, "REWARDS missing rate");
check("rewards", { ...valid, payment_model: "per_views", rate_per_1k_views: 0 }, false, "REWARDS zero rate");
check("rewards", { ...valid, payment_model: "per_views", rate_per_1k_views: 3 }, true, "REWARDS valid rate");
check("rewards", { ...valid, payment_model: "fixed_per_content", fixed_rate: 0 }, false, "REWARDS missing fixed");
check("rewards", { ...valid, payment_model: "fixed_per_content", fixed_rate: 50 }, true, "REWARDS valid fixed");
check("rewards", { ...valid, total_budget: "500", rate_per_1k_views: "3" }, true, "REWARDS numeric strings");

// TARGETING
check("targeting", { ...valid, allowed_platforms: [] }, false, "TARGETING empty platforms");
check("targeting", { ...valid, allowed_platforms: ["myspace"] }, false, "TARGETING invalid platform");
check("targeting", { ...valid, allowed_platforms: ["tiktok"] }, true, "TARGETING one platform");
check("targeting", { ...valid, allowed_platforms: ["tiktok", "instagram"] }, true, "TARGETING multiple platforms");

// REQUIREMENTS
check("requirements", { ...valid, min_duration: null, max_duration: 60 }, false, "REQUIREMENTS missing min");
check("requirements", { ...valid, min_duration: 15, max_duration: null }, false, "REQUIREMENTS missing max");
check("requirements", { ...valid, min_duration: 0, max_duration: 60 }, false, "REQUIREMENTS zero min");
check("requirements", { ...valid, min_duration: 15, max_duration: 0 }, false, "REQUIREMENTS zero max");
check("requirements", { ...valid, min_duration: -5, max_duration: 60 }, false, "REQUIREMENTS negative");
check("requirements", { ...valid, min_duration: Number.NaN, max_duration: 60 }, false, "REQUIREMENTS NaN");
check("requirements", { ...valid, min_duration: 15, max_duration: Number.POSITIVE_INFINITY }, false, "REQUIREMENTS Infinity");
check("requirements", { ...valid, min_duration: 90, max_duration: 15 }, false, "REQUIREMENTS min > max");
check("requirements", { ...valid, min_duration: 30, max_duration: 30 }, true, "REQUIREMENTS min = max");
check("requirements", { ...valid, min_duration: 15, max_duration: 60 }, true, "REQUIREMENTS valid");
check("requirements", { ...valid, min_duration: "15", max_duration: "60" }, true, "REQUIREMENTS numeric strings");
check("requirements", { ...valid, min_duration: "", max_duration: "" }, false, "REQUIREMENTS empty strings");

// ASSETS
check("assets", { ...valid, media: [] }, true, "ASSETS empty allowed");
check("assets", { ...valid, media: [{ url: "x" }] }, true, "ASSETS with files allowed");

// WORKFLOW — visited / draft / autosave must not complete an invalid step
const emptyDurations = { ...valid, min_duration: 0, max_duration: 0 };
assert.equal(validateCampaignStep("requirements", emptyDurations).success, false);
assert.equal(isCampaignStepComplete(emptyDurations, 4), false, "Continue blocked: requirements invalid");
assert.equal(isCampaignStepComplete(emptyDurations, 5), false, "Assets not green while requirements invalid");
assert.equal(canOpenCampaignWizardStep(emptyDurations, 5), false, "Direct ?step=assets blocked");
assert.equal(canOpenCampaignWizardStep(emptyDurations, 6), false, "Direct ?step=review blocked");
assert.equal(firstIncompleteCampaignStep(emptyDurations), 4);
assert.equal(validateCampaignWizardReady(emptyDurations).success, false, "Review blocked when invalid");
assert.equal(assertCampaignReadyForFunding(emptyDurations).success, false, "readyForFunding blocked when invalid");

assert.equal(isCampaignStepComplete(valid, 4), true, "Continue advances: requirements valid");
assert.equal(canOpenCampaignWizardStep(valid, 5), true);
assert.equal(canOpenCampaignWizardStep(valid, 6), true);
assert.equal(validateCampaignWizardReady(valid).success, true, "readyForFunding succeeds when valid");

const visitedOnly = { title: "x", campaign_type: "ugc" };
assert.equal(isCampaignStepComplete(visitedOnly, 4), false, "Stepper does not use visited state");
assert.equal(isCampaignStepComplete({ ...emptyDurations, _visited: true, _draftId: "abc" }, 4), false);

const progressInvalid = campaignWizardProgressPercent(emptyDurations);
const progressValid = campaignWizardProgressPercent(valid);
assert.ok(progressInvalid < progressValid, "Progress uses valid steps, not current index");
assert.equal(progressValid, 100);

// Draft save semantics: title + rewards can be valid while requirements are not
assert.equal(validateCampaignStep("basics", emptyDurations).success, true);
assert.equal(validateCampaignStep("rewards", emptyDurations).success, true);
assert.equal(validateCampaignWizardReady(emptyDurations).success, false, "draft != ready");

// API — POST readyForFunding
assert.equal(assertCampaignReadyForFunding({ ...valid, readyForFunding: true }).success, true);
assert.equal(assertCampaignReadyForFunding({ ...emptyDurations, readyForFunding: true }).success, false);

// API — PATCH resulting state
const existing = {
  title: "Summer Glow",
  campaign_type: "ugc",
  payment_model: "per_views",
  rate_per_1k_views: 3,
  total_budget: 500,
  allowed_platforms: ["tiktok"],
  min_duration: null,
  max_duration: null,
  status: "draft",
};
const patchedInvalid = { ...existing, status: "active" };
assert.equal(assertCampaignReadyForFunding(patchedInvalid).success, false, "PATCH invalid cannot become ready");
assert.equal(
  campaignNeedsCompletenessGate({ currentStatus: "draft", nextStatus: "active" }),
  true,
);
assert.equal(
  campaignNeedsCompletenessGate({ currentStatus: "paused", nextStatus: "active" }),
  false,
  "Resume paused does not re-run wizard gate",
);
assert.equal(
  campaignNeedsCompletenessGate({ currentStatus: "draft", readyForFunding: true }),
  true,
);

const patchedValid = { ...existing, min_duration: 15, max_duration: 60 };
assert.equal(assertCampaignReadyForFunding(patchedValid).success, true, "PATCH valid can become ready");

// coerce / DB strings
assert.equal(coerceFiniteNumber(""), null);
assert.equal(coerceFiniteNumber("  "), null);
assert.equal(coerceFiniteNumber("15"), 15);
assert.equal(coerceFiniteNumber(Number.NaN), null);
assert.equal(coerceFiniteNumber(Infinity), null);
assert.equal(toCampaignWizardDraft({ title: "A", min_duration: "15", max_duration: "60" }).min_duration, 15);

console.log("verify-ugc-campaign-wizard: ok");
