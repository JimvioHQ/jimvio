/**
 * Static verification: Community Group/Channel posting permission model.
 * No network / no secrets.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const channelConstants = read(
  "lib/community/owner-console/channels/constants.ts"
);
const channelTypes = read("lib/community/owner-console/channels/types.ts");
const posting = read("lib/community/workspace/channel-posting.ts");
const assertPublish = read(
  "lib/community/workspace/assert-can-publish.ts"
);
const perms = read("lib/community/workspace/permissions.ts");
const chatRoom = read("components/community/chat/ChatRoom.tsx");
const roomContent = read(
  "components/community/workspace/room-content.tsx"
);
const messagesApi = read("app/api/messages/[roomId]/route.ts");
const postsApi = read("app/api/posts/route.ts");
const settings = read(
  "components/community/owner-console/channels/ChannelSettingsPage.tsx"
);
const groupConstants = read(
  "lib/community/owner-console/groups/constants.ts"
);
const loader = read("lib/community/load-community-workspace.ts");

// Posting modes exist
assert.match(channelTypes, /CHANNEL_POSTING_MODES/);
assert.match(channelTypes, /admins_moderators/);
assert.match(channelTypes, /admins_only/);
assert.match(channelTypes, /publisherIds/);

// Default channel posting is staff-only (broadcast-first)
assert.match(
  channelConstants,
  /postingMode:\s*"admins_moderators"/
);
assert.match(
  channelConstants,
  /whoCanPost:\s*\[\.\.\.POSTING_MODE_ACTORS\.admins_moderators\]/
);

// Channels are always broadcast-first; open posting is Group Discussion only
assert.match(channelConstants, /DISCUSSION_PERMISSION_CONFIG/);
assert.match(channelConstants, /postingMode:\s*"everyone"/);
assert.match(channelConstants, /permissionConfigForTemplate/);
assert.match(channelConstants, /general_chat/);
assert.match(
  channelConstants,
  /Open member posting exists only on the Group Discussion room/
);

// Engine helpers
assert.match(posting, /export function canPublishInChannel/);
assert.match(posting, /export function canCommentInChannel/);
assert.match(posting, /publisherIds\.includes/);
assert.match(assertPublish, /assertCanPublishInRoom/);

// Existing role engine still present
assert.match(perms, /resolveWorkspaceRole/);
assert.match(perms, /buildPermissions/);
assert.match(perms, /member: new Set\(/);
assert.match(perms, /guest: new Set\(\["community\.view", "channel\.read"\]\)/);

// UI: composer hidden when posting forbidden; copy matches channel type
assert.match(chatRoom, /Only authorized publishers can post/);
assert.match(chatRoom, /canPost/);
assert.match(chatRoom, /readOnlyTitle/);
assert.match(roomContent, /canPost=\{channel\.canPublish\}/);
assert.match(roomContent, /resolveChannelEmptyCopy/);

// Server enforcement
assert.match(messagesApi, /assertCanPublishInRoom/);
assert.match(postsApi, /assertCanPublishInRoom/);

// Owner Console posting mode UI
assert.match(settings, /Posting mode/);
assert.match(settings, /applyPostingMode/);
assert.match(settings, /Publisher/);
assert.match(settings, /Who can comment/);
assert.match(settings, /Who can upload media/);
assert.match(settings, /Who can create threads/);

// Group settings: voice + live + sub-channels
assert.match(groupConstants, /whoCanCreateVoiceRooms/);
assert.match(groupConstants, /whoCanCreateLiveSessions/);
assert.match(
  groupConstants,
  /whoCanUpload: \["owner", "admin", "moderator", "creator", "mentor", "member"\]/
);

// Workspace loads permission_config for runtime checks
assert.match(loader, /permission_config/);
assert.match(loader, /behavior_config/);
assert.match(loader, /room_staff/);
assert.match(loader, /channel_staff_role/);

console.log("verify-community-channel-permissions: OK");
