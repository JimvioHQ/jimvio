/**
 * Remaining UGC gaps: i18n keys, workspace switcher, honest workflow skip status,
 * brandId query plumbing. Does not weaken prior acceptance/hardening verifies.
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
  const out = path.join(
    os.tmpdir(),
    `${path.basename(rel, ".ts")}-${process.pid}-${Math.random().toString(16).slice(2)}.mjs`,
  );
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

const workspacesApi = read("app/api/ugc/workspaces/route.ts");
const switcher = read("components/ugc/workspace/UgcWorkspaceSwitcher.tsx");
const provider = read("components/ugc/workspace/UgcBrandWorkspaceProvider.tsx");
const layoutClient = read("components/ugc/workspace/UGCWorkspaceLayoutClient.tsx");
const brandQuery = read("lib/ugc/client/with-brand-query.ts");
const locale = read("context/LocaleContext.tsx");
const messages = read("lib/ugc/i18n/messages.ts");
const pageShell = read("components/ugc/workspace/UGCPageShell.tsx");
const shell = read("components/ugc/workspace/UGCWorkspaceShell.tsx");
const workflowRun = read("app/api/ugc/workflows/[id]/run/route.ts");
const workflowList = read("app/api/ugc/workflows/route.ts");
const workflowBuilder = read("components/ugc/enterprise/WorkflowBuilderPage.tsx");
const campaigns = read("app/api/ugc/campaigns/route.ts");
const teamPage = read("components/ugc/enterprise/BrandTeamPage.tsx");
const permissions = read("lib/ugc/enterprise/permissions.ts");
const cards = read("components/ugc/campaign-card-shared.tsx");
const vercel = read("vercel.json");
const wizard = read("components/ugc/campaign-center/CampaignCreateWizard.tsx");

assert.match(workspacesApi, /listAccessibleBrandIds/);
assert.match(workspacesApi, /resolveBrandRole/);
assert.doesNotMatch(workspacesApi, /searchParams\.get\("role"\)/);

assert.match(switcher, /switchWorkspace/);
assert.match(switcher, /aria-label/);
assert.match(provider, /listAccessibleBrandIds|\/api\/ugc\/workspaces/);
assert.match(provider, /writeStoredBrandId/);
assert.match(provider, /Forbidden/);
assert.match(layoutClient, /UgcBrandWorkspaceProvider/);
assert.match(brandQuery, /brandId=/);

assert.match(locale, /document\.documentElement/);
assert.match(locale, /root\.lang = locale/);
assert.match(pageShell, /titleKey/);
assert.match(pageShell, /ugcStatusLabel/);
assert.match(shell, /aria-expanded/);
assert.match(shell, /Escape/);

assert.match(workflowRun, /completed_with_skipped/);
assert.match(workflowRun, /steps_skipped/);
assert.match(workflowRun, /brandIdFromRequest/);
assert.doesNotMatch(workflowRun, /simulated: true/);
assert.match(workflowList, /brandIdFromRequest/);
assert.match(workflowBuilder, /workflowWaitNote/);
assert.match(workflowBuilder, /workflowSkippedUnsupported/);
assert.doesNotMatch(workflowBuilder, /Workflow completed/);

assert.match(campaigns, /userCanAccessBrand/);
assert.match(campaigns, /brandIdFromRequest\(req\)/);
assert.match(campaigns, /get\('mine'\) === '1'/);
assert.match(teamPage, /ugcFetch/);
assert.match(wizard, /brand_id: brandId/);
assert.match(wizard, /wizardStepReview/);

assert.match(permissions, /viewer: new Set\(\["finance\.view"\]\)/);
assert.match(cards, /spent_budget/);
assert.match(cards, /leftLabel/);

assert.doesNotMatch(vercel, /ugc\/workflows/);
assert.doesNotMatch(read("app/api/ugc/workflows/[id]/run/route.ts"), /localStorage/);

const i18n = await loadTs("lib/ugc/i18n/messages.ts");
assert.equal(i18n.ugcMessage("en", "joinedCount", { count: 3 }), "3 joined");
assert.ok(i18n.ugcMessage("fr", "switchWorkspace").length > 0);
assert.ok(i18n.ugcMessage("rw", "workflowWaitNote").length > 0);
assert.notEqual(i18n.ugcMessage("en", "workflows"), i18n.ugcMessage("fr", "workflows"));
assert.equal(i18n.ugcStatusLabel("en", "revision_requested"), "Revision requested");

const permMod = await loadTs("lib/ugc/enterprise/permissions.ts");
assert.equal(permMod.roleCan("viewer", "finance.view"), true);
assert.equal(permMod.roleCan("viewer", "finance.payout"), false);
assert.equal(permMod.roleCan("viewer", "campaigns.manage"), false);

console.log("verify-ugc-remaining-gaps: ok");
