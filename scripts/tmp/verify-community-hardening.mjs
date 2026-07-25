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

// Frozen community surfaces still present
const modules = [
  "components/community/chat/ChatRoom.tsx",
  "components/community/rooms/CourseRoom.tsx",
  "components/community/rooms/ResourcesRoom.tsx",
  "components/community/hub/CommunityAiPanel.tsx",
  "components/community/hub/hub-live-page.tsx",
  "components/community/workspace/group/GroupWorkspace.tsx",
  "app/api/c/ai/route.ts",
  "app/api/c/live/sessions/[id]/route.ts",
  "lib/community/ai-context.ts",
  "services/live/session-service.ts",
];
for (const rel of modules) mustExist(rel);

const aiRoute = mustExist("app/api/c/ai/route.ts");
const liveGet = mustExist("app/api/c/live/sessions/[id]/route.ts");
const liveSvc = mustExist("services/live/session-service.ts");
const hubLive = mustExist("components/community/hub/hub-live-page.tsx");
const dock = mustExist("components/community/hub/live/ControlDock.tsx");
const chatRoom = mustExist("components/community/chat/ChatRoom.tsx");
const postsApi = mustExist("app/api/posts/route.ts");
const messagesApi = mustExist("app/api/messages/[roomId]/route.ts");
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
assert.match(access, /canAccessRoom/);
assert.match(postsApi, /canAccessRoom/);
assert.match(messagesApi, /canAccessRoom/);

// Live UX continuity
assert.match(dock, /onLeave/);
assert.match(hubLive, /leaveLive|onLeave/);
assert.match(hubLive, /pendingInvite|Accept/);
assert.match(hubLive, /Discussion/);
assert.doesNotMatch(hubLive, /Speaker invite received — accepting/);

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
