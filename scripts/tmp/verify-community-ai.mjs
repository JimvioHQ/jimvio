/**
 * Production Community Brain — permission-aware /api/c/ai.
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

const aiRoute = mustExist("app/api/c/ai/route.ts");
const aiContext = mustExist("lib/community/ai-context.ts");
const panel = mustExist("components/community/hub/CommunityAiPanel.tsx");
const channelAi = mustExist(
  "components/community/workspace/channel/panels/ChannelAiPanel.tsx"
);
const messageAi = mustExist(
  "components/community/chat/message-engine/MessageAiPanel.tsx"
);
const layout = mustExist("app/communities/components/Layout.tsx");

assert.match(aiRoute, /loadCommunityAiContext/);
assert.match(aiRoute, /rateLimit/);
assert.match(aiRoute, /communityId is required/);
assert.match(aiRoute, /Never invent|unavailable/);
assert.match(aiRoute, /sanitizeAiUserPrompt|softFallback/);
assert.match(aiRoute, /draft|faq/);
assert.doesNotMatch(
  aiRoute,
  /Recent posts show active discussion — reply to keep momentum/
);

assert.match(aiContext, /loadCommunityAiContext/);
assert.match(aiContext, /canAccessRoomRow|accessibleRoomIds/);
assert.match(aiContext, /community_courses/);
assert.match(aiContext, /community_messages/);
assert.match(aiContext, /pinnedPosts|rules|resources|knowledge/);
assert.match(aiContext, /sanitizeAiUserPrompt/);
assert.match(aiContext, /Titles only|lesson bodies/i);
assert.doesNotMatch(aiContext, /from\("messages"\)/);

assert.match(panel, /Community Brain/);
assert.match(panel, /communityId/);
assert.match(panel, /Retry/);
assert.match(panel, /Find resources|Announcement draft|FAQ/);

assert.match(channelAi, /roomId/);
assert.match(channelAi, /focus/);
assert.match(channelAi, /Retry/);
assert.match(channelAi, /Community Brain/);

assert.match(messageAi, /communityId/);
assert.match(messageAi, /Retry/);

assert.match(layout, /communityId=\{communityId\}/);
assert.match(layout, /useCommunityIdFromPath/);

console.log("verify-community-ai: ok");
