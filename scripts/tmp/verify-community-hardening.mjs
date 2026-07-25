/**
 * Community platform production hardening smoke checks.
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

function mustNotExist(rel) {
  assert.ok(!fs.existsSync(path.join(root, rel)), `obsolete file still present: ${rel}`);
}

// Frozen community surfaces still present
const modules = [
  "components/community/chat/ChatRoom.tsx",
  "components/community/rooms/CourseRoom.tsx",
  "components/community/rooms/ResourcesRoom.tsx",
  "components/community/hub/CommunityAiPanel.tsx",
  "components/community/hub/hub-live-page.tsx",
  "components/community/workspace/group/GroupWorkspace.tsx",
  "components/community/workspace/room-content.tsx",
  "app/api/c/ai/route.ts",
  "app/api/c/live/sessions/[id]/route.ts",
  "app/api/c/feed/assist/route.ts",
  "app/api/posts/[postId]/comments/route.ts",
  "lib/community/ai-context.ts",
  "lib/community/posts/sanitize-post-media.ts",
  "services/live/session-service.ts",
  "services/community/hub-data.ts",
];
for (const rel of modules) mustExist(rel);

// Dead commented shells must stay deleted
mustNotExist("components/community/rooms/ChatRoom.tsx");
mustNotExist("components/community/workspace-shell.tsx");

const aiRoute = mustExist("app/api/c/ai/route.ts");
const liveGet = mustExist("app/api/c/live/sessions/[id]/route.ts");
const liveSvc = mustExist("services/live/session-service.ts");
const hubData = mustExist("services/community/hub-data.ts");
const hubLive = mustExist("components/community/hub/hub-live-page.tsx");
const reactions = mustExist("components/community/live-collab/LiveReactionsBar.tsx");
const useLive = mustExist("hooks/live/useLiveSession.ts");
const dock = mustExist("components/community/hub/live/ControlDock.tsx");
const chatRoom = mustExist("components/community/chat/ChatRoom.tsx");
const roomContent = mustExist("components/community/workspace/room-content.tsx");
const postsApi = mustExist("app/api/posts/route.ts");
const commentsApi = mustExist("app/api/posts/[postId]/comments/route.ts");
const messagesApi = mustExist("app/api/messages/[roomId]/route.ts");
const assistApi = mustExist("app/api/c/feed/assist/route.ts");
const sanitizeMedia = mustExist("lib/community/posts/sanitize-post-media.ts");
const chatHook = mustExist("hooks/useChatRoom.ts");
const access = mustExist("services/accessControl.ts");

// Security / ACL
assert.match(aiRoute, /rateLimit/);
assert.match(aiRoute, /communityId is required|canView|No access/);
assert.match(liveGet, /canViewLiveSession/);
assert.match(liveGet, /rateLimit/);
assert.match(liveSvc, /invite_only/);
assert.match(liveSvc, /assertCanHostLive|creator/);
assert.match(liveSvc, /requestSpeak/);
assert.match(liveSvc, /Join the live session before requesting/);
assert.match(liveSvc, /assertCommunityMember\(targetId/);
assert.match(liveSvc, /hand_raised is owned by requestSpeak/);
assert.doesNotMatch(
  liveSvc.slice(liveSvc.indexOf("export async function updateSelfMedia")),
  /hand_raised:\s*Boolean\(patch\.handRaised\)|hand_raised:\s*patch\.handRaised/
);
assert.match(access, /canAccessRoom/);
assert.match(postsApi, /canAccessRoom/);
assert.match(postsApi, /rateLimit/);
assert.match(postsApi, /sanitizePostAttachments/);
assert.match(sanitizeMedia, /sanitizePostAttachments/);
assert.match(messagesApi, /canAccessRoom/);
assert.match(messagesApi, /rateLimit/);
assert.match(commentsApi, /rateLimit/);
assert.match(assistApi, /rateLimit/);

// Raise-hand production path
assert.match(useLive, /requestSpeak/);
assert.match(reactions, /onRaiseHand/);
assert.match(hubLive, /requestSpeak/);

// Live UX continuity
assert.match(dock, /onLeave/);
assert.match(hubLive, /leaveLive|onLeave/);
assert.match(hubLive, /pendingInvite|Accept/);
assert.match(hubLive, /Discussion/);
assert.doesNotMatch(hubLive, /Speaker invite received — accepting/);
assert.doesNotMatch(hubLive, /i === 0\s*\?\s*"host"/);
assert.doesNotMatch(hubLive, /i === 0\s*\?\s*micOn/);

// Live dashboard must not invent speakers from chat authors / ratio analytics
assert.match(hubData, /listParticipants/);
assert.match(hubData, /never invent Host\/Speaker from chat authors/);
assert.doesNotMatch(hubData, /role:\s*seen\.size === 1 \? "Host" : "Speaker"/);
assert.doesNotMatch(hubData, /Math\.round\(viewers \* 0\.85\)/);
assert.doesNotMatch(hubData, /chatMessages\.length \* 2/);

// live/voice channels route to Live Studio
assert.match(roomContent, /case "live"/);
assert.match(roomContent, /case "voice"/);
assert.match(roomContent, /\/communities\/\$\{community\.slug\}\/live/);

// No duplicate unfiltered inbox realtime channel
assert.doesNotMatch(chatHook, /channel\("inbox_updates"\)/);
assert.match(chatHook, /inbox_list_\$\{communityId\}/);

// Chat engine still canonical
assert.match(chatRoom, /MessageCard|message-engine/);
assert.doesNotMatch(hubLive, /fork ChatRoom/i);

// Prior module verifies still on disk
for (const name of [
  "verify-group-experience.mjs",
  "verify-channel-experience.mjs",
  "verify-posts-ecosystem.mjs",
  "verify-learning-experience.mjs",
  "verify-community-ai.mjs",
  "verify-live-experience.mjs",
]) {
  assert.ok(
    fs.existsSync(path.join(root, "scripts/tmp", name)),
    `missing scripts/tmp/${name}`
  );
}

console.log("verify-community-hardening: ok");
