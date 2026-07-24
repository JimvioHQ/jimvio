/**
 * Lightweight foundation smoke checks (no network).
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

const types = mustExist("lib/community/workspace/types.ts");
const perms = mustExist("lib/community/workspace/permissions.ts");
const mappers = mustExist("lib/community/workspace/mappers.ts");
const index = mustExist("lib/community/workspace/index.ts");
const nav = mustExist("lib/community/workspace/navigation.ts");
const shell = mustExist(
  "components/community/workspace/channel/ChannelWorkspace.tsx"
);
const channelPage = mustExist(
  "components/community/workspace/channel/ChannelWorkspacePage.tsx"
);
const groupPage = mustExist(
  "components/community/workspace/group/GroupWorkspacePage.tsx"
);
const roomContent = mustExist(
  "components/community/workspace/room-content.tsx"
);

assert.match(types, /CHANNEL_TYPES/);
assert.match(types, /WorkspaceGroup/);
assert.match(types, /WorkspaceChannel/);
assert.match(types, /CHANNEL_TABS/);
assert.match(types, /"knowledge"/);
assert.match(types, /"threads"/);
assert.match(perms, /resolveWorkspaceRole/);
assert.match(perms, /buildPermissions/);
assert.match(perms, /canEnterChannel/);
assert.match(mappers, /mapSpaceToGroup/);
assert.match(mappers, /mapRoomToChannel/);
assert.match(index, /export/);
assert.match(nav, /communityGroupHref/);
assert.match(nav, /communityChannelHref/);
assert.doesNotMatch(nav, /\?space=/);
assert.match(shell, /ChannelWorkspace/);
assert.match(shell, /discussion/);
assert.match(channelPage, /RoomContent/);
assert.match(channelPage, /ChannelWorkspacePage/);
assert.match(groupPage, /GroupWorkspace/);
assert.match(roomContent, /ChannelWorkspace/);
assert.match(roomContent, /mapRoomToChannel/);

mustExist("app/communities/(hubs)/[slug]/groups/[groupSlug]/page.tsx");
mustExist(
  "app/communities/(hubs)/[slug]/groups/[groupSlug]/channels/[channelSlug]/page.tsx"
);

console.log("Community workspace foundation verification passed.");
