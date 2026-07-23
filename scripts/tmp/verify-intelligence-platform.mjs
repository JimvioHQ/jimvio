/**
 * Jimvio Intelligence Platform (Phase 7) smoke checks — no network.
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

const types = mustExist("lib/community/intelligence/types.ts");
const derive = mustExist("lib/community/intelligence/derive.ts");
const store = mustExist("lib/community/intelligence/store.ts");
const index = mustExist("lib/community/intelligence/index.ts");
const dashboard = mustExist(
  "components/community/intelligence/IntelligenceDashboard.tsx"
);
const host = mustExist(
  "components/community/intelligence/CommunityIntelligenceHost.tsx"
);
const creatorIntel = mustExist(
  "components/community/intelligence/CreatorIntelligencePanel.tsx"
);
const uiIndex = mustExist("components/community/intelligence/index.ts");
const osDash = mustExist(
  "components/community/os/CreatorOSDashboard.tsx"
);
const channelAi = mustExist(
  "components/community/workspace/channel/panels/ChannelAiPanel.tsx"
);
const creatorProfile = mustExist(
  "components/creator-profile/CreatorProfilePage.tsx"
);
const creatorTabs = mustExist("lib/creator-profile/index.ts");
const perms = mustExist("lib/community/workspace/permissions.ts");
const aiRoute = mustExist("app/api/c/ai/route.ts");
const chatRoom = mustExist("components/community/chat/ChatRoom.tsx");

assert.match(types, /INTELLIGENCE_DOMAINS/);
assert.match(types, /community/);
assert.match(types, /commerce/);
assert.match(types, /live/);
assert.match(types, /moderation/);
assert.match(types, /RECOMMENDATION_KINDS/);
assert.match(types, /AUTOMATION_KINDS/);
assert.match(types, /ANALYTICS_METRICS/);
assert.match(derive, /buildIntelligenceSnapshot/);
assert.match(derive, /deriveRecommendations/);
assert.match(derive, /deriveAutomations/);
assert.match(derive, /formatIntelligenceContext/);
assert.match(store, /useIntelligenceStore/);
assert.match(index, /export/);
assert.match(dashboard, /IntelligenceDashboard/);
assert.match(dashboard, /RecommendationRail/);
assert.match(dashboard, /AutomationSuggestions/);
assert.match(dashboard, /UnifiedAnalyticsStrip/);
assert.match(host, /CommunityIntelligenceHost/);
assert.match(host, /useRoomMessageIndex/);
assert.match(host, /useCollaborationStore/);
assert.match(host, /useCreatorCommerceStore/);
assert.match(creatorIntel, /CreatorIntelligence/);
assert.match(uiIndex, /CommunityIntelligenceHost/);
assert.match(osDash, /CommunityIntelligenceHost/);
assert.match(channelAi, /Platform intelligence/);
assert.match(channelAi, /formatIntelligenceContext/);
assert.match(channelAi, /RecommendationRail/);
assert.match(creatorProfile, /CreatorIntelligencePanel/);
assert.match(creatorTabs, /id: "intelligence"/);
assert.match(perms, /intelligence\.view/);
assert.match(aiRoute, /softFallback|OPENAI_API_KEY/);

assert.doesNotMatch(host, /fork ChatRoom/i);
assert.doesNotMatch(channelAi, /fork ChatRoom/i);
assert.doesNotMatch(derive, /new WebSocket/);
assert.match(chatRoom, /MessageCard|message-engine/);

console.log("Jimvio intelligence platform verification passed.");
