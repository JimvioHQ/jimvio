/**
 * Community Owner Analytics Platform smoke checks — no network.
 * Auto-picked up by ci:prepush via scripts/tmp/verify-*.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function mustExist(rel) {
  const p = path.join(root, rel);
  assert.ok(fs.existsSync(p), `missing ${rel}`);
  return fs.readFileSync(p, "utf8");
}

const types = mustExist("lib/community/owner-console/analytics/types.ts");
const constants = mustExist(
  "lib/community/owner-console/analytics/constants.ts"
);
const auth = mustExist("lib/community/owner-console/analytics/auth.ts");
const compute = mustExist("lib/community/owner-console/analytics/compute.ts");
const analyticsIndex = mustExist(
  "lib/community/owner-console/analytics/index.ts"
);
const perms = mustExist("lib/community/workspace/permissions.ts");
const nav = mustExist("lib/community/owner-console/nav.ts");
const api = mustExist("app/api/c/owner/analytics/route.ts");
const apiExport = mustExist("app/api/c/owner/analytics/export/route.ts");
const page = mustExist(
  "app/dashboard/communities/[communitySlug]/analytics/page.tsx"
);
const management = mustExist(
  "components/community/owner-console/analytics/AnalyticsManagement.tsx"
);
const body = mustExist(
  "components/community/owner-console/analytics/AnalyticsSectionBody.tsx"
);
const charts = mustExist(
  "components/community/owner-console/analytics/AnalyticsCharts.tsx"
);
const hook = mustExist(
  "components/community/owner-console/analytics/useOwnerAnalytics.ts"
);

assert.match(types, /ANALYTICS_SECTIONS/);
assert.match(types, /OwnerAnalyticsBundle/);
assert.match(types, /AnalyticsScore/);
assert.match(types, /OwnerAnalyticsAiInsights/);
assert.match(constants, /SECTION_LABELS/);
assert.match(constants, /scoreTier/);
assert.match(constants, /rangeBounds/);
assert.match(auth, /resolveAnalyticsContext/);
assert.match(auth, /analytics\.view/);
assert.match(compute, /computeOwnerAnalytics/);
assert.match(compute, /healthScore/);
assert.match(analyticsIndex, /export/);
assert.match(perms, /analytics\.view/);
assert.match(perms, /analytics\.export/);
assert.match(perms, /analytics\.manage/);
assert.match(nav, /analytics\.view/);
assert.match(api, /export async function GET/);
assert.match(api, /computeOwnerAnalytics/);
assert.match(apiExport, /csv/);
assert.match(apiExport, /xlsx|ExcelJS/);
assert.match(apiExport, /pdf/);
assert.match(page, /sectionId="analytics"/);
assert.match(page, /AnalyticsManagement/);
assert.match(management, /ANALYTICS_SECTIONS/);
assert.match(management, /dynamic\(/);
assert.match(management, /CSV|Excel|PDF/);
assert.match(body, /ScoreGrid|AiInsightsPanel/);
assert.match(charts, /recharts|AreaChart|BarChart/);
assert.match(hook, /useOwnerAnalytics/);

console.log("Community owner analytics platform verification passed.");
