/**
 * Production Space experience — pure conversation (Header + Feed + Composer).
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

const groupWs = mustExist(
  "components/community/workspace/group/GroupWorkspace.tsx"
);
const groupHeader = mustExist(
  "components/community/workspace/group/GroupHeader.tsx"
);
const groupPage = mustExist(
  "components/community/workspace/group/GroupWorkspacePage.tsx"
);
const aboutPanel = mustExist(
  "components/community/workspace/space/SpaceAboutPanel.tsx"
);
const resolveDiscussion = mustExist(
  "lib/community/workspace/resolve-group-discussion-room.ts"
);
const assertPublish = mustExist(
  "lib/community/workspace/assert-can-publish.ts"
);
const roomsApi = mustExist("app/api/rooms/[spaceId]/route.ts");
const sidebar = mustExist("components/shell/CommunitySidebar.tsx");
const chatRoom = mustExist("components/community/chat/ChatRoom.tsx");

// Pure conversation — no tab chrome / GroupSidebar
assert.match(groupWs, /ChatRoom/);
assert.match(groupWs, /ensure_discussion/);
assert.match(groupWs, /hideSidebar/);
assert.match(groupWs, /SpaceAboutPanel/);
assert.match(groupWs, /onAbout/);
assert.doesNotMatch(groupWs, /GroupSidebar/);
assert.doesNotMatch(groupWs, /WorkspaceTabBar/);
assert.doesNotMatch(groupWs, /tab === "events"/);
assert.doesNotMatch(groupWs, /tab === "members"/);
assert.doesNotMatch(groupWs, /Create Channel/);

assert.match(groupHeader, /About/);
assert.match(groupHeader, /onAbout/);
assert.match(groupHeader, /Join|Joined/);
assert.match(aboutPanel, /About this Space/);
assert.match(aboutPanel, /DsDrawer/);
assert.match(groupPage, /GroupWorkspace/);
assert.match(resolveDiscussion, /resolveGroupDiscussionRoom/);

assert.match(assertPublish, /DISCUSSION_PERMISSION_CONFIG/);
assert.match(assertPublish, /isGroupDiscussionRoom|channel_kind === "discussion"/);
assert.match(roomsApi, /ensure_discussion/);
assert.match(roomsApi, /DISCUSSION_PERMISSION_CONFIG/);
assert.match(roomsApi, /channel_kind: "discussion"/);

// Spaces sidebar: flat Spaces list + Discover; no Channels
assert.match(sidebar, /Spaces/);
assert.match(sidebar, /Discover/);
assert.match(sidebar, /Create your first Space|Create Space/);
assert.doesNotMatch(sidebar, /CreateChannelDialog/);
assert.doesNotMatch(sidebar, />\s*Channels\s*</);

// Reuses frozen Chat engine — do not fork
assert.match(groupWs, /from "@\/components\/community\/chat\/ChatRoom"/);
assert.match(chatRoom, /useConversationMessages|VirtualMessageList/);
assert.match(chatRoom, /hideSidebar/);

console.log("verify-group-experience: ok");
