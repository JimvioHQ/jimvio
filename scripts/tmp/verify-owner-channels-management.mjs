/**
 * Community Owner Channels Management smoke checks — no network.
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
  "database/migrations/096_owner_channels_management.sql"
);
const types = mustExist("lib/community/owner-console/channels/types.ts");
const constants = mustExist("lib/community/owner-console/channels/constants.ts");
const auth = mustExist("lib/community/owner-console/channels/auth.ts");
const mappers = mustExist("lib/community/owner-console/channels/mappers.ts");
const apiList = mustExist("app/api/c/owner/channels/route.ts");
const apiReorder = mustExist("app/api/c/owner/channels/reorder/route.ts");
const apiOne = mustExist("app/api/c/owner/channels/[id]/route.ts");
const apiActions = mustExist("app/api/c/owner/channels/[id]/actions/route.ts");
const apiStaff = mustExist("app/api/c/owner/channels/[id]/staff/route.ts");
const apiMembers = mustExist("app/api/c/owner/channels/[id]/members/route.ts");
const apiAnalytics = mustExist(
  "app/api/c/owner/channels/[id]/analytics/route.ts"
);
const page = mustExist("app/community-owner/channels/page.tsx");
const settingsPage = mustExist(
  "app/community-owner/channels/[channelId]/page.tsx"
);
const management = mustExist(
  "components/community/owner-console/channels/ChannelsManagement.tsx"
);
const wizard = mustExist(
  "components/community/owner-console/channels/CreateChannelWizard.tsx"
);
const list = mustExist(
  "components/community/owner-console/channels/ChannelsList.tsx"
);
const settings = mustExist(
  "components/community/owner-console/channels/ChannelSettingsPage.tsx"
);

assert.match(migration, /room_staff/);
assert.match(migration, /channel_kind/);
assert.match(migration, /permission_config/);
assert.match(types, /OwnerChannelKind/);
assert.match(types, /CHANNEL_SETTINGS_TABS/);
assert.match(types, /OwnerChannelAction/);
assert.match(constants, /CHANNEL_TEMPLATES/);
assert.match(constants, /CHANNEL_KIND_TO_ROOM_TYPE/);
assert.match(auth, /resolveChannelManageContext/);
assert.match(auth, /channel\.manage/);
assert.match(mappers, /mapRoomToOwnerChannel/);
assert.match(apiList, /export async function GET/);
assert.match(apiList, /export async function POST/);
assert.match(apiReorder, /orderedIds/);
assert.match(apiOne, /export async function PATCH/);
assert.match(apiActions, /duplicate/);
assert.match(apiActions, /move/);
assert.match(apiStaff, /room_staff/);
assert.match(apiMembers, /space_access/);
assert.match(apiAnalytics, /OwnerChannelAnalytics/);
assert.match(page, /sectionId="channels"/);
assert.match(page, /ChannelsManagement/);
assert.match(settingsPage, /ChannelSettingsPage/);
assert.match(management, /Create Channel/);
assert.match(wizard, /STEPS/);
assert.match(wizard, /Publish/);
assert.match(list, /draggable|Drag to reorder/);
assert.match(settings, /Danger Zone|danger/);
assert.match(settings, /automation/);
assert.match(settings, /CHANNEL_SETTINGS_TABS/);

console.log("Community owner channels management verification passed.");
