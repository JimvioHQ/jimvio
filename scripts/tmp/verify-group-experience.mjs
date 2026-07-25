/**
 * Production Group experience — Discussion-first, member nav, open Discussion permissions.
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
const groupWs = mustExist(
  "components/community/workspace/group/GroupWorkspace.tsx"
);
const groupHeader = mustExist(
  "components/community/workspace/group/GroupHeader.tsx"
);
const groupPage = mustExist(
  "components/community/workspace/group/GroupWorkspacePage.tsx"
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

// Nav order: Discussion → … → Overview (secondary)
assert.match(
  osTypes,
  /GROUP_TAB_IDS = \[\s*"discussion",\s*"knowledge",\s*"resources"/s
);
assert.match(osTypes, /"ai",\s*"overview",\s*\] as const/);
assert.doesNotMatch(osTypes, /GROUP_TAB_IDS = \[[^\]]*"events"/s);
assert.doesNotMatch(osTypes, /GROUP_TAB_IDS = \[[^\]]*"members"/s);
assert.doesNotMatch(osTypes, /GROUP_TAB_IDS = \[[^\]]*"activity"/s);
assert.doesNotMatch(osTypes, /GROUP_TAB_IDS = \[[^\]]*"settings"/s);

// Discussion-first homepage
assert.match(groupWs, /useState<GroupTabId>\("discussion"\)/);
assert.match(groupWs, /ChatRoom/);
assert.match(groupWs, /ensure_discussion/);
assert.match(groupWs, /compact=\{tab === "discussion"\}/);
assert.doesNotMatch(groupWs, /tab === "events"/);
assert.doesNotMatch(groupWs, /tab === "members"/);

assert.match(groupHeader, /compact/);
assert.match(groupPage, /GroupWorkspace/);
assert.match(resolveDiscussion, /resolveGroupDiscussionRoom/);

// Group Discussion stays open for members; channels keep posting modes
assert.match(assertPublish, /DISCUSSION_PERMISSION_CONFIG/);
assert.match(assertPublish, /isGroupDiscussionRoom|channel_kind === "discussion"/);
assert.match(roomsApi, /ensure_discussion/);
assert.match(roomsApi, /DISCUSSION_PERMISSION_CONFIG/);
assert.match(roomsApi, /channel_kind: "discussion"/);

// Spaces sidebar: nested rooms under Space; Discussion not duplicated as a room link
assert.match(sidebar, /shouldHideFromSpaceNav|Discussion is the Space homepage/);
assert.match(sidebar, /Spaces/);
assert.match(sidebar, /Create your first Space|Create Space/);
assert.match(sidebar, /buildSpaceRooms\(slug, spacesWithRooms/);
assert.doesNotMatch(sidebar, /CreateChannelDialog/);
assert.doesNotMatch(sidebar, />\s*Channels\s*</);
assert.doesNotMatch(groupWs, /Create Channel/);

// Reuses frozen Chat engine — do not fork
assert.match(groupWs, /from "@\/components\/community\/chat\/ChatRoom"/);
assert.match(chatRoom, /useConversationMessages|VirtualMessageList/);

console.log("verify-group-experience: ok");
