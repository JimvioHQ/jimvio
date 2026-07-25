/**
 * Production Space experience — mockup-aligned discussion UI.
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
const chrome = mustExist(
  "components/community/workspace/space/SpaceViewChrome.tsx"
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

assert.match(groupWs, /ChatRoom/);
assert.match(groupWs, /ensure_discussion/);
assert.match(groupWs, /hideSidebar/);
assert.match(groupWs, /discussionLayout/);
assert.match(groupWs, /SpaceAboutPanel/);
assert.match(groupWs, /SpaceViewTabs/);
assert.doesNotMatch(groupWs, /showCallPanel/);
assert.doesNotMatch(groupWs, /SpaceFeedFilters/);
assert.match(groupWs, /tab === "members"/);
assert.match(groupWs, /tab === "files"/);
assert.match(groupWs, /tab === "events"/);
assert.doesNotMatch(groupWs, /GroupSidebar/);
assert.doesNotMatch(groupWs, /Create Channel/);

assert.match(groupHeader, /onAbout|About/);
assert.match(groupHeader, /onSearch|Search/);
assert.match(groupHeader, /onAudioCall|Audio call/);
assert.match(groupHeader, /onVideoCall|Video call/);
assert.doesNotMatch(groupHeader, /Online|67 Online/);
assert.match(chrome, /Discussion/);
assert.match(chrome, /Members|Files|Events|About/);
assert.doesNotMatch(chrome, /SpaceFeedFilters|Unanswered|Newest/);
assert.match(aboutPanel, /About this space/i);
assert.match(aboutPanel, /View all details/);
assert.match(aboutPanel, /DsDrawer/);
assert.match(groupPage, /GroupWorkspace/);
assert.match(resolveDiscussion, /resolveGroupDiscussionRoom/);

assert.match(assertPublish, /DISCUSSION_PERMISSION_CONFIG/);
assert.match(assertPublish, /isGroupDiscussionRoom|channel_kind === "discussion"/);
assert.match(roomsApi, /ensure_discussion/);
assert.match(roomsApi, /DISCUSSION_PERMISSION_CONFIG/);
assert.match(roomsApi, /channel_kind: "discussion"/);

assert.match(sidebar, /Spaces/);
assert.match(sidebar, /Overview/);
assert.match(sidebar, /Back to Feed/);
assert.match(sidebar, /Create your first Space|Create Space/);
assert.match(sidebar, /members/);
assert.doesNotMatch(sidebar, /Join Community/);
assert.doesNotMatch(sidebar, /Invite People/);
assert.doesNotMatch(sidebar, /CreateChannelDialog/);
assert.doesNotMatch(sidebar, />\s*Channels\s*</);

assert.match(groupWs, /from "@\/components\/community\/chat\/ChatRoom"/);
assert.match(chatRoom, /useConversationMessages|VirtualMessageList/);
assert.match(chatRoom, /hideSidebar/);
assert.match(chatRoom, /discussionLayout/);

console.log("verify-group-experience: ok");
