/**
 * Production Group experience — Discussion-first, Channel sections, open Discussion permissions.
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
const groupSidebar = mustExist(
  "components/community/workspace/group/GroupSidebar.tsx"
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

// Nav order: Discussion → Channel sections (no Inbox / DMs / Calls in Group)
assert.match(
  osTypes,
  /GROUP_TAB_IDS = \[\s*"discussion",\s*"announcements",\s*"resources"/s
);
assert.match(osTypes, /"marketplace",\s*"campaigns",\s*\] as const/);
assert.match(osTypes, /GROUP_CHANNEL_SECTION_IDS/);
assert.doesNotMatch(osTypes, /GROUP_TAB_IDS = \[[^\]]*"events"/s);
assert.doesNotMatch(osTypes, /GROUP_TAB_IDS = \[[^\]]*"members"/s);
assert.doesNotMatch(osTypes, /GROUP_TAB_IDS = \[[^\]]*"activity"/s);
assert.doesNotMatch(osTypes, /GROUP_TAB_IDS = \[[^\]]*"settings"/s);
assert.doesNotMatch(osTypes, /GROUP_TAB_IDS = \[[^\]]*"store"/s);
assert.doesNotMatch(osTypes, /GROUP_TAB_IDS = \[[^\]]*"overview"/s);

// Discussion-first homepage
assert.match(groupWs, /useState<GroupTabId>\("discussion"\)/);
assert.match(groupWs, /ChatRoom/);
assert.match(groupWs, /conversationSurface="space"/);
assert.match(groupWs, /ensure_discussion/);
assert.match(groupWs, /compact=\{tab === "discussion"\}/);
assert.match(groupWs, /tab === "announcements"/);
assert.match(groupWs, /tab === "campaigns"/);
assert.match(groupWs, /tab === "marketplace"/);
assert.doesNotMatch(groupWs, /tab === "events"/);
assert.doesNotMatch(groupWs, /tab === "members"/);
assert.doesNotMatch(groupWs, /tab === "overview"/);
assert.doesNotMatch(groupWs, /tab === "store"/);

assert.match(groupSidebar, /Channels/);
assert.match(groupSidebar, /GROUP_CHANNEL_SECTION_IDS/);
assert.match(groupHeader, /compact/);
assert.match(groupPage, /GroupWorkspace/);
assert.match(resolveDiscussion, /resolveGroupDiscussionRoom/);

// Group Discussion stays open for members; channels keep posting modes
assert.match(assertPublish, /DISCUSSION_PERMISSION_CONFIG/);
assert.match(assertPublish, /isGroupDiscussionRoom|channel_kind === "discussion"/);
assert.match(roomsApi, /ensure_discussion/);
assert.match(roomsApi, /DISCUSSION_PERMISSION_CONFIG/);
assert.match(roomsApi, /channel_kind: "discussion"/);
assert.match(roomsApi, /const isOpenChat = ensureDiscussion/);

// Channels appear under selected Group; Discussion not duplicated as a Channel
assert.match(sidebar, /shouldHideFromChannelNav|Discussion is the Group homepage/);
assert.match(sidebar, /Open a Group to see Channels|groupChannels/);
assert.match(sidebar, /buildChannels\(slug, spacesWithRooms, \{ spaceId/);
assert.doesNotMatch(
  sidebar,
  /room_type === "posts" \|\| \/announcement\/i\.test\(room\.name\)\) return true/
);

// Reuses frozen Chat engine — do not fork; space surface excludes Inbox/Calls/DMs
assert.match(groupWs, /from "@\/components\/community\/chat\/ChatRoom"/);
assert.match(chatRoom, /conversationSurface/);
assert.match(chatRoom, /"hub" \| "space"/);
assert.match(chatRoom, /useConversationMessages|VirtualMessageList/);
assert.match(chatRoom, /!isSpaceChat && \(/);

console.log("verify-group-experience: ok");
