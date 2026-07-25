/**
 * Production Channel experience — templates, empty states, posting modes, nav.
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

const constants = mustExist("lib/community/owner-console/channels/constants.ts");
const types = mustExist("lib/community/owner-console/channels/types.ts");
const emptyCopy = mustExist("lib/community/workspace/channel-empty-copy.ts");
const roomContent = mustExist(
  "components/community/workspace/room-content.tsx"
);
const chatRoom = mustExist("components/community/chat/ChatRoom.tsx");
const postsRoom = mustExist("components/community/rooms/PostsRoom.tsx");
const posting = mustExist("lib/community/workspace/channel-posting.ts");
const assertPublish = mustExist(
  "lib/community/workspace/assert-can-publish.ts"
);
const sidebar = mustExist("components/shell/CommunitySidebar.tsx");
const loader = mustExist("lib/community/load-community-workspace.ts");
const mappers = mustExist("lib/community/workspace/mappers.ts");
const createDialog = mustExist("components/community/CreateChannelDialog.tsx");
const roomsApi = mustExist("app/api/rooms/[spaceId]/route.ts");
const channelPage = mustExist(
  "app/communities/(hubs)/[slug]/channels/[channelSlug]/page.tsx"
);

const requiredTemplates = [
  "general_chat",
  "announcements",
  "introductions",
  "wins",
  "support",
  "resources",
  "knowledge",
  "campaigns",
  "marketplace",
  "media",
  "files",
  "events",
  "voice",
  "live",
];
for (const id of requiredTemplates) {
  assert.match(constants, new RegExp(`id: "${id}"`));
}
assert.match(types, /"introductions"/);
assert.match(types, /"campaigns"/);
assert.match(types, /"media"/);
assert.match(types, /"files"/);
assert.match(types, /"events"/);

assert.match(constants, /permissionConfigForTemplate/);
assert.match(constants, /introductions/);
assert.match(constants, /DISCUSSION_PERMISSION_CONFIG/);
assert.match(constants, /postingMode:\s*"everyone"/);
assert.match(constants, /postingMode:\s*"admins_moderators"/);

assert.match(emptyCopy, /Publish your first announcement/);
assert.match(emptyCopy, /Start the conversation/);
assert.match(emptyCopy, /Ask your first question/);
assert.match(emptyCopy, /Upload your first resource/);
assert.match(emptyCopy, /Create your first knowledge article/);
assert.match(emptyCopy, /Launch your first campaign/);
assert.match(emptyCopy, /resolveChannelEmptyCopy/);

assert.match(roomContent, /resolveChannelEmptyCopy/);
assert.match(roomContent, /canPost=\{channel\.canPublish\}/);
assert.match(roomContent, /ChatRoom/);
assert.match(roomContent, /PostsRoom/);
assert.doesNotMatch(roomContent, /fork ChatRoom/i);

assert.match(chatRoom, /readOnlyTitle/);
assert.match(chatRoom, /canPost \?/);
assert.match(postsRoom, /emptyTitle/);
assert.match(postsRoom, /readOnlyTitle/);
assert.match(postsRoom, /canPost \?/);

assert.match(posting, /canPublishInChannel/);
assert.match(assertPublish, /assertCanPublishInRoom/);
assert.match(loader, /channel_kind/);
assert.match(mappers, /channel_kind/);

assert.match(sidebar, /buildSpaceRooms\(slug, spacesWithRooms/);
assert.match(sidebar, /shouldHideFromSpaceNav|Discussion is the Space homepage/);
assert.match(createDialog, /CHANNEL_TEMPLATES/);
assert.match(roomsApi, /DEFAULT_PERMISSION_CONFIG|DISCUSSION_PERMISSION_CONFIG/);
assert.match(roomsApi, /channel_kind/);
assert.match(channelPage, /permanentRedirect|ChannelWorkspacePage/);
mustExist("app/communities/(hubs)/[slug]/spaces/[spaceSlug]/page.tsx");

console.log("verify-channel-experience: ok");
