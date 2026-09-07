/**
 * Static + unit gate for admin UGC activate-override and Discover featured header.
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

const activate = read("app/api/admin/ugc/campaigns/[id]/activate/route.ts");
const list = read("app/api/admin/ugc/campaigns/route.ts");
const brandPatch = read("app/api/ugc/campaigns/[id]/route.ts");
const deposit = read("app/api/ugc/campaigns/[id]/deposit/route.ts");
const adminUi = read("components/admin/admin-campaigns-client.tsx");
const discover = read("components/ugc/workspace/UGCDiscoverPage.tsx");
const header = read("components/ugc/workspace/UGCFeaturedHeader.tsx");
const migration = read("database/migrations/143_ugc_admin_activate_override.sql");

assert.match(activate, /requirePlatformAdmin/);
assert.match(activate, /writeAuditEvent/);
assert.match(activate, /ugc\.campaign\.activate_override/);
assert.match(activate, /recordUgcActivity/);
assert.doesNotMatch(activate, /from\("ugc_campaign_escrow"\)\.insert/);
assert.doesNotMatch(activate, /from\("ugc_campaign_escrow"\)\s*\n\s*\.insert/);
assert.doesNotMatch(activate, /campaign\.funded/);
assert.match(activate, /status: "active"/);

assert.match(list, /requirePlatformAdmin/);
assert.match(list, /escrow_state/);

assert.match(brandPatch, /You must deposit the required campaign budget/);
assert.match(deposit, /ugc_campaign_escrow/);

assert.match(adminUi, /Mark as Active/);
assert.match(adminUi, /\/api\/admin\/ugc\/campaigns\//);
assert.match(adminUi, /Funding will not be recorded/);
assert.match(adminUi, /Admin activated/);

assert.match(discover, /UGCFeaturedHeader/);
assert.match(discover, /UGC & Clipping/);
assert.doesNotMatch(discover, /total > 1/);

assert.match(header, /h-\[210px\]/);
assert.match(header, /sm:h-\[280px\]/);
assert.match(header, /lg:h-\[320px\]/);
assert.match(header, /#FF5A1F/);
assert.match(header, /#FFFFFF/);
assert.doesNotMatch(header, /#0d0500/);
assert.match(header, /joinCampaign/);
assert.match(header, /viewBrief/);
assert.doesNotMatch(header, /Heart/);
assert.doesNotMatch(header, /formatCreatorCount/);
assert.doesNotMatch(header, /typeLabel/);

assert.match(migration, /activated_by_admin/);
assert.match(migration, /admin_activated_by/);

const guard = read("database/migrations/144_ugc_admin_activate_column_guard.sql");
assert.match(guard, /ugc_campaigns_protect_admin_activation/);
assert.match(guard, /service_role/);

const rules = await loadTs("lib/ugc/admin-activate-override.ts");
assert.equal(rules.canAdminActivateOverride("draft"), true);
assert.equal(rules.canAdminActivateOverride("paused"), true);
assert.equal(rules.canAdminActivateOverride("active"), false);
assert.equal(rules.canAdminActivateOverride("completed"), false);
assert.equal(rules.canAdminActivateOverride("cancelled"), false);
assert.equal(rules.isAdminActivateIdempotent("active"), true);
assert.equal(rules.adminActivateOverrideError("completed")?.status, 409);
assert.equal(rules.adminActivateOverrideError("active"), null);
assert.equal(rules.normalizeAdminActivateReason("  go live  "), "go live");
assert.equal(rules.normalizeAdminActivateReason("   "), null);

console.log("UGC admin activate override + featured header checks passed");
