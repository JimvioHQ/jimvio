/**
 * Creator Workspace rebuild smoke checks — no network.
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

const osTypes = mustExist("lib/community/os/types.ts");
const nav = mustExist("lib/community/workspace/navigation.ts");
const groupWs = mustExist(
  "components/community/workspace/group/GroupWorkspace.tsx"
);
const groupHeader = mustExist(
  "components/community/workspace/group/GroupHeader.tsx"
);
const groupSidebar = mustExist(
  "components/community/workspace/group/GroupSidebar.tsx"
);
const channelWs = mustExist(
  "components/community/workspace/channel/ChannelWorkspace.tsx"
);
const channelHeader = mustExist(
  "components/community/workspace/channel/ChannelHeader.tsx"
);
const tabBar = mustExist(
  "components/community/workspace/shared/WorkspaceTabBar.tsx"
);
const roster = mustExist(
  "components/community/workspace/shared/useCommunityRoster.ts"
);
const files = mustExist(
  "components/community/workspace/channel/panels/FilesPanel.tsx"
);
const media = mustExist(
  "components/community/workspace/channel/panels/MediaPanel.tsx"
);
const members = mustExist(
  "components/community/workspace/channel/panels/MembersPanel.tsx"
);
const roomContent = mustExist(
  "components/community/workspace/room-content.tsx"
);
const shell = mustExist(
  "components/community/workspace/WorkspaceShell.tsx"
);
const roomIndex = mustExist(
  "lib/community/chat/room-message-index.ts"
);

assert.match(osTypes, /GROUP_TABS/);
assert.match(osTypes, /"discussion"/);
assert.match(osTypes, /"live"/);
assert.match(osTypes, /GROUP_SIDEBAR/);
assert.match(nav, /communityRoomHref/);
assert.match(nav, /roomTypeIcon/);
assert.match(groupWs, /GroupHeader/);
assert.match(groupWs, /GroupSidebar/);
assert.match(groupWs, /communityRoomHref/);
assert.match(groupHeader, /Member Count|members/i);
assert.match(groupSidebar, /Settings/);
assert.match(osTypes, /label: "Discussion"/);
assert.match(osTypes, /"activity"/);
assert.match(channelWs, /initialTab = "home"/);
assert.match(channelWs, /HomePanel/);
assert.match(channelWs, /lazy/);
assert.match(channelWs, /requestSearch/);
assert.match(channelHeader, /notifications|Bell/i);
assert.match(channelHeader, /pinned/i);
assert.match(tabBar, /WorkspaceTabBar/);
assert.match(roster, /community_memberships/);
assert.match(files, /grid|List/);
assert.match(files, /Quick search|search files/i);
assert.match(media, /Images|Videos|Audio/);
assert.match(members, /ROLE_STYLE|role/i);
assert.match(roomContent, /ChannelWorkspace/);
assert.doesNotMatch(roomContent, /Chat UI goes here/);
assert.match(shell, /communityGroupHref|communityChannelHref/);
assert.match(shell, /WorkspaceProvider/);
assert.doesNotMatch(shell, /searchParams\.get\([\"']space[\"']\)/);
assert.doesNotMatch(nav, /\?space=/);
assert.match(nav, /\/groups\//);
assert.match(nav, /\/channels\//);
assert.match(nav, /communityChannelHref\(\s*communitySlug,\s*channelSlug/);
assert.match(roomIndex, /requestSearch/);
assert.doesNotMatch(channelWs, /fork ChatRoom/i);

mustExist("app/communities/(hubs)/[slug]/groups/[groupSlug]/page.tsx");
mustExist("app/communities/(hubs)/[slug]/channels/[channelSlug]/page.tsx");
const legacyNested = mustExist(
  "app/communities/(hubs)/[slug]/groups/[groupSlug]/channels/[channelSlug]/page.tsx"
);
assert.match(legacyNested, /permanentRedirect/);
mustExist("lib/community/workspace/legacy-redirect.ts");
assert.match(
  mustExist("lib/community/workspace/legacy-redirect.ts"),
  /redirectLegacySpaceRoomQuery/
);

console.log("Creator workspace rebuild verification passed.");
