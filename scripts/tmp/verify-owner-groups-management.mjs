/**
 * Community Owner Groups Management smoke checks — no network.
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
  "database/migrations/095_owner_groups_management.sql"
);
const types = mustExist("lib/community/owner-console/groups/types.ts");
const constants = mustExist("lib/community/owner-console/groups/constants.ts");
const auth = mustExist("lib/community/owner-console/groups/auth.ts");
const mappers = mustExist("lib/community/owner-console/groups/mappers.ts");
const groupsIndex = mustExist("lib/community/owner-console/groups/index.ts");
const apiList = mustExist("app/api/c/owner/groups/route.ts");
const apiReorder = mustExist("app/api/c/owner/groups/reorder/route.ts");
const apiOne = mustExist("app/api/c/owner/groups/[id]/route.ts");
const apiActions = mustExist("app/api/c/owner/groups/[id]/actions/route.ts");
const apiStaff = mustExist("app/api/c/owner/groups/[id]/staff/route.ts");
const apiMembers = mustExist("app/api/c/owner/groups/[id]/members/route.ts");
const apiAnalytics = mustExist(
  "app/api/c/owner/groups/[id]/analytics/route.ts"
);
const spacesPage = mustExist(
  "app/dashboard/communities/[communitySlug]/spaces/page.tsx"
);
const groupsRedirect = mustExist(
  "app/dashboard/communities/[communitySlug]/groups/page.tsx"
);
const settingsPage = mustExist(
  "app/dashboard/communities/[communitySlug]/groups/[groupId]/page.tsx"
);
const management = mustExist(
  "components/community/owner-console/groups/GroupsManagement.tsx"
);
const wizard = mustExist(
  "components/community/owner-console/groups/CreateGroupWizard.tsx"
);
const list = mustExist(
  "components/community/owner-console/groups/GroupsList.tsx"
);
const settings = mustExist(
  "components/community/owner-console/groups/GroupSettingsPage.tsx"
);
const nav = mustExist("lib/community/owner-console/nav.ts");

assert.match(migration, /space_staff/);
assert.match(migration, /permission_config/);
assert.match(migration, /privacy/);
assert.match(migration, /admins_manage_spaces/);
assert.match(types, /GroupPrivacyMode/);
assert.match(types, /GROUP_SETTINGS_TABS/);
assert.match(types, /OwnerGroupAction/);
assert.match(constants, /DEFAULT_PERMISSION_CONFIG/);
assert.match(constants, /GROUP_ICON_PRESETS/);
assert.match(auth, /resolveGroupManageContext/);
assert.match(auth, /group\.manage/);
assert.match(mappers, /mapSpaceToOwnerGroup/);
assert.match(groupsIndex, /export/);
assert.match(apiList, /export async function GET/);
assert.match(apiList, /export async function POST/);
assert.match(apiReorder, /orderedIds/);
assert.match(apiOne, /export async function PATCH/);
assert.match(apiOne, /export async function DELETE/);
assert.match(apiActions, /duplicate/);
assert.match(apiActions, /archive/);
assert.match(apiStaff, /space_staff/);
assert.match(apiMembers, /space_access/);
assert.match(apiAnalytics, /OwnerGroupAnalytics/);
assert.match(spacesPage, /sectionId="spaces"/);
assert.match(spacesPage, /GroupsManagement/);
assert.match(groupsRedirect, /permanentRedirect/);
assert.match(groupsRedirect, /spaces/);
assert.match(settingsPage, /GroupSettingsPage/);
assert.match(management, /Create Space/);
assert.match(management, /Bulk|selected/);
assert.match(wizard, /Create Space/);
assert.match(wizard, /STEPS/);
assert.match(wizard, /Publish/);
assert.match(list, /Drag to reorder|draggable/);
assert.match(settings, /Danger Zone|danger/);
assert.match(settings, /moderators/);
assert.match(settings, /analytics/);
assert.match(settings, /GROUP_SETTINGS_TABS/);
assert.match(nav, /create_space/);
assert.match(nav, /Create Space/);
assert.doesNotMatch(nav, /label: "Create Group"/);
assert.doesNotMatch(nav, /label: "Create Channel"/);

console.log("Community owner groups management verification passed.");
