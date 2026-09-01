/**
 * Community Owner Moderation Center smoke checks — no network.
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

const migration = mustExist(
  "database/migrations/099_owner_moderation_center.sql"
);
const types = mustExist("lib/community/owner-console/moderation/types.ts");
const constants = mustExist(
  "lib/community/owner-console/moderation/constants.ts"
);
const auth = mustExist("lib/community/owner-console/moderation/auth.ts");
const mappers = mustExist("lib/community/owner-console/moderation/mappers.ts");
const modIndex = mustExist("lib/community/owner-console/moderation/index.ts");
const perms = mustExist("lib/community/workspace/permissions.ts");
const nav = mustExist("lib/community/owner-console/nav.ts");
const apiList = mustExist("app/api/c/owner/moderation/route.ts");
const apiReport = mustExist(
  "app/api/c/owner/moderation/reports/[id]/route.ts"
);
const apiBulk = mustExist("app/api/c/owner/moderation/bulk/route.ts");
const apiAppeals = mustExist("app/api/c/owner/moderation/appeals/route.ts");
const apiRules = mustExist("app/api/c/owner/moderation/rules/route.ts");
const apiMembers = mustExist("app/api/c/owner/moderation/members/route.ts");
const apiAudit = mustExist("app/api/c/owner/moderation/audit/route.ts");
const apiAnalytics = mustExist(
  "app/api/c/owner/moderation/analytics/route.ts"
);
const page = mustExist(
  "app/owner/communities/[communitySlug]/moderation/page.tsx"
);
const management = mustExist(
  "components/community/owner-console/moderation/ModerationManagement.tsx"
);
const queue = mustExist(
  "components/community/owner-console/moderation/ModerationQueue.tsx"
);
const detail = mustExist(
  "components/community/owner-console/moderation/ReportDetailPanel.tsx"
);
const panels = mustExist(
  "components/community/owner-console/moderation/ModerationPanels.tsx"
);
const hook = mustExist(
  "components/community/owner-console/moderation/useOwnerModeration.ts"
);

assert.match(migration, /community_moderation_appeals/);
assert.match(migration, /community_auto_moderation_rules/);
assert.match(migration, /risk_level/);
assert.match(migration, /ai_classification/);
assert.match(types, /OwnerReportListItem/);
assert.match(types, /MODERATION_QUEUES/);
assert.match(types, /MODERATION_ACTIONS/);
assert.match(types, /OwnerModerationAnalytics/);
assert.match(constants, /DEFAULT_AUTO_MOD_RULES/);
assert.match(constants, /spam_detection/);
assert.match(constants, /capabilityForModerationAction/);
assert.match(auth, /resolveModerationContext/);
assert.match(auth, /moderation\.view/);
assert.match(auth, /canModerateTarget/);
assert.match(mappers, /mapReportRow/);
assert.match(modIndex, /export/);
assert.match(perms, /moderation\.view/);
assert.match(perms, /moderation\.warn/);
assert.match(perms, /moderation\.mute/);
assert.match(perms, /moderation\.suspend/);
assert.match(perms, /moderation\.ban/);
assert.match(perms, /moderation\.delete/);
assert.match(nav, /moderation\.view/);
assert.match(apiList, /export async function GET/);
assert.match(apiList, /overview/);
assert.match(apiReport, /export async function POST/);
assert.match(apiReport, /warn/);
assert.match(apiReport, /mute/);
assert.match(apiReport, /ban/);
assert.match(apiReport, /delete_content/);
assert.match(apiBulk, /export/);
assert.match(apiAppeals, /in_review/);
assert.match(apiRules, /seedDefaults/);
assert.match(apiMembers, /muted/);
assert.match(apiAudit, /community_moderation_logs/);
assert.match(apiAnalytics, /reportsPerDay|OwnerModerationAnalytics/);
assert.match(page, /sectionId="moderation"/);
assert.match(page, /ModerationManagement/);
assert.match(management, /QUEUE_LABELS|Moderation Queue|Bulk/);
assert.match(management, /Export/);
assert.match(queue, /useVirtualizer/);
assert.match(detail, /Content preview|Evidence|History/);
assert.match(panels, /AutoModPanel|AppealsPanel|ModerationAnalyticsPanel/);
assert.match(hook, /useOwnerModeration/);

console.log("Community owner moderation center verification passed.");
