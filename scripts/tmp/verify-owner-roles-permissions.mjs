/**
 * Community Owner Roles & Permissions smoke checks — no network.
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
  "database/migrations/098_owner_roles_permissions.sql"
);
const types = mustExist("lib/community/owner-console/roles/types.ts");
const constants = mustExist("lib/community/owner-console/roles/constants.ts");
const auth = mustExist("lib/community/owner-console/roles/auth.ts");
const mappers = mustExist("lib/community/owner-console/roles/mappers.ts");
const rolesIndex = mustExist("lib/community/owner-console/roles/index.ts");
const perms = mustExist("lib/community/workspace/permissions.ts");
const apiList = mustExist("app/api/c/owner/roles/route.ts");
const apiOne = mustExist("app/api/c/owner/roles/[id]/route.ts");
const apiActions = mustExist("app/api/c/owner/roles/[id]/actions/route.ts");
const apiAssign = mustExist("app/api/c/owner/roles/assign/route.ts");
const apiAnalytics = mustExist("app/api/c/owner/roles/analytics/route.ts");
const apiAudit = mustExist("app/api/c/owner/roles/audit/route.ts");
const apiExport = mustExist("app/api/c/owner/roles/export/route.ts");
const page = mustExist(
  "app/dashboard/communities/[communitySlug]/roles/page.tsx"
);
const management = mustExist(
  "components/community/owner-console/roles/RolesManagement.tsx"
);
const list = mustExist(
  "components/community/owner-console/roles/RolesList.tsx"
);
const editor = mustExist(
  "components/community/owner-console/roles/RoleEditor.tsx"
);
const createDlg = mustExist(
  "components/community/owner-console/roles/CreateRoleDialog.tsx"
);
const analytics = mustExist(
  "components/community/owner-console/roles/RolesAnalyticsPanel.tsx"
);
const hook = mustExist(
  "components/community/owner-console/roles/useOwnerRoles.ts"
);

assert.match(migration, /community_custom_roles/);
assert.match(migration, /community_role_audit_logs/);
assert.match(migration, /custom_role_id/);
assert.match(types, /OwnerRoleListItem/);
assert.match(types, /ROLE_EDITOR_TABS/);
assert.match(types, /PermissionCategoryId/);
assert.match(types, /OwnerRoleTemplate/);
assert.match(constants, /PERMISSION_CATALOG/);
assert.match(constants, /ROLE_TEMPLATES/);
assert.match(constants, /community_admin/);
assert.match(constants, /sanitizeCapabilities/);
assert.match(auth, /resolveRoleManageContext/);
assert.match(auth, /roles\.manage/);
assert.match(auth, /canMutateRoleTarget/);
assert.match(auth, /canAssignRoleToMember/);
assert.match(mappers, /buildSystemRoleItems/);
assert.match(mappers, /system:/);
assert.match(rolesIndex, /export/);
assert.match(perms, /roles\.view/);
assert.match(perms, /roles\.manage/);
assert.match(perms, /normalizeCapability|ALL_CAPABILITIES/);
assert.match(apiList, /export async function GET/);
assert.match(apiList, /export async function POST/);
assert.match(apiOne, /export async function PATCH/);
assert.match(apiOne, /privilege escalation/);
assert.match(apiActions, /duplicate/);
assert.match(apiActions, /archive/);
assert.match(apiAssign, /Bulk assign|assign/);
assert.match(apiAssign, /scheduledAt/);
assert.match(apiAnalytics, /OwnerRoleAnalytics|membersPerRole/);
assert.match(apiAudit, /community_role_audit_logs/);
assert.match(apiExport, /export async function GET/);
assert.match(apiExport, /export async function POST/);
assert.match(page, /sectionId="roles"/);
assert.match(page, /RolesManagement/);
assert.match(management, /Create Role/);
assert.match(management, /Role Templates|templates/);
assert.match(management, /Export/);
assert.match(management, /Import/);
assert.match(list, /OwnerRoleListItem/);
assert.match(editor, /ROLE_EDITOR_TABS/);
assert.match(editor, /permissions/);
assert.match(editor, /Bulk Assign/);
assert.match(createDlg, /ROLE_TEMPLATES|fromTemplate/);
assert.match(analytics, /Members per role|mostUsedRoles/);
assert.match(hook, /useOwnerRoles/);

console.log("Community owner roles & permissions verification passed.");
