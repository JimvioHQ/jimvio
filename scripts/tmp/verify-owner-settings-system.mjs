/**
 * Community Owner Settings System smoke checks — no network.
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
  "database/migrations/100_owner_community_settings.sql"
);
const types = mustExist("lib/community/owner-console/settings/types.ts");
const constants = mustExist(
  "lib/community/owner-console/settings/constants.ts"
);
const auth = mustExist("lib/community/owner-console/settings/auth.ts");
const mappers = mustExist("lib/community/owner-console/settings/mappers.ts");
const settingsIndex = mustExist(
  "lib/community/owner-console/settings/index.ts"
);
const perms = mustExist("lib/community/workspace/permissions.ts");
const nav = mustExist("lib/community/owner-console/nav.ts");
const api = mustExist("app/api/c/owner/settings/route.ts");
const apiDanger = mustExist("app/api/c/owner/settings/danger/route.ts");
const apiExport = mustExist("app/api/c/owner/settings/export/route.ts");
const page = mustExist(
  "app/dashboard/communities/[communitySlug]/settings/page.tsx"
);
const management = mustExist(
  "components/community/owner-console/settings/SettingsManagement.tsx"
);
const form = mustExist(
  "components/community/owner-console/settings/SettingsSectionForm.tsx"
);
const hook = mustExist(
  "components/community/owner-console/settings/useOwnerSettings.ts"
);

assert.match(migration, /settings JSONB/);
assert.match(migration, /visibility_mode/);
assert.match(migration, /accent_color/);
assert.match(migration, /archived_at/);
assert.match(types, /SETTINGS_SECTIONS/);
assert.match(types, /OwnerCommunitySettings/);
assert.match(types, /CommunitySettingsConfig/);
assert.match(types, /DangerAction/);
assert.match(constants, /SETTINGS_SECTION_LABELS/);
assert.match(constants, /defaultSettingsConfig/);
assert.match(constants, /Danger Zone|danger/);
assert.match(auth, /resolveSettingsContext/);
assert.match(auth, /settings\.view/);
assert.match(auth, /canPerformDangerAction/);
assert.match(mappers, /mapCommunitySettings/);
assert.match(mappers, /mergeSettingsConfig/);
assert.match(settingsIndex, /export/);
assert.match(perms, /settings\.view/);
assert.match(perms, /settings\.manage/);
assert.match(perms, /security\.manage/);
assert.match(nav, /settings\.view/);
assert.match(api, /export async function GET/);
assert.match(api, /export async function PATCH/);
assert.match(apiDanger, /archive/);
assert.match(apiDanger, /delete/);
assert.match(apiDanger, /transfer/);
assert.match(apiExport, /exportedAt/);
assert.match(page, /sectionId="settings"/);
assert.match(page, /SettingsManagement/);
assert.match(management, /SETTINGS_SECTIONS/);
assert.match(form, /General|Branding|Danger Zone/);
assert.match(form, /CloudinaryUploadButton/);
assert.match(hook, /useOwnerSettings/);

console.log("Community owner settings system verification passed.");
