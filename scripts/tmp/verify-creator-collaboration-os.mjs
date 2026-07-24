/**
 * Creator Collaboration OS (Phase 4) smoke checks — no network.
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
const osScore = mustExist("lib/community/os/score.ts");
const osStore = mustExist("lib/community/os/store.ts");
const osIndex = mustExist("lib/community/os/index.ts");
const dashboard = mustExist(
  "components/community/os/CreatorOSDashboard.tsx"
);
const scoreCard = mustExist(
  "components/community/os/CommunityScoreCard.tsx"
);
const taskCards = mustExist("components/community/os/TaskEventCards.tsx");
const convertTask = mustExist(
  "components/community/os/ConvertToTaskDialog.tsx"
);
const resources = mustExist("components/community/os/ResourceLibrary.tsx");
const groupWs = mustExist(
  "components/community/workspace/group/GroupWorkspace.tsx"
);
const spaces = mustExist(
  "components/community/workspace/sections/SpacesSection.tsx"
);
const eventsSection = mustExist(
  "components/community/workspace/sections/EventsSection.tsx"
);
const resourcesSection = mustExist(
  "components/community/workspace/sections/ResourcesSection.tsx"
);
const eventsPanel = mustExist(
  "components/community/workspace/channel/panels/EventsPanel.tsx"
);
const aiPanel = mustExist(
  "components/community/workspace/channel/panels/ChannelAiPanel.tsx"
);
const overview = mustExist(
  "components/community/hub/hub-community-overview.tsx"
);
const chatRoom = mustExist("components/community/chat/ChatRoom.tsx");
const messageCard = mustExist(
  "components/community/chat/message-engine/MessageCard.tsx"
);
const memberProfile = mustExist(
  "components/community/MemberProfilePanel.tsx"
);
const creatorProfile = mustExist(
  "components/creator-profile/CreatorProfilePage.tsx"
);
const creatorTabs = mustExist("lib/creator-profile/index.ts");
const channelWs = mustExist(
  "components/community/workspace/channel/ChannelWorkspace.tsx"
);

assert.match(osTypes, /GROUP_TABS/);
assert.match(osTypes, /CollaborationTask/);
assert.match(osTypes, /CollaborationEvent/);
assert.match(osTypes, /COLLAB_OBJECT_KINDS/);
assert.match(osScore, /computeCommunityScore/);
assert.match(osScore, /knowledgePoints/);
assert.match(osStore, /useCreatorOSStore/);
assert.match(osStore, /convertMessageToTask/);
assert.match(osIndex, /export/);
assert.match(dashboard, /CreatorOSDashboard/);
assert.match(dashboard, /Continue learning/);
assert.match(dashboard, /Knowledge highlights/);
assert.match(dashboard, /Marketplace picks/);
assert.match(scoreCard, /CommunityScoreCard/);
assert.match(taskCards, /TaskCard/);
assert.match(taskCards, /EventCard/);
assert.match(taskCards, /RSVP/);
assert.match(convertTask, /Convert to Task/);
assert.match(resources, /PDF Library/);
assert.match(resources, /RESOURCE_LIBRARY_SHELVES/);
assert.match(groupWs, /GroupWorkspace/);
assert.match(groupWs, /GROUP_TABS/);
assert.match(spaces, /GroupCard/);
assert.match(spaces, /communityGroupHref/);
assert.match(eventsSection, /useCreatorOSStore/);
assert.match(resourcesSection, /ResourceLibrary/);
assert.match(eventsPanel, /Schedule event|RSVP/);
assert.match(aiPanel, /Suggest mentors/);
assert.match(aiPanel, /Find previous answers/);
// Creator OS dashboard remains intact; Overview stays member-first (no OS mount).
assert.doesNotMatch(overview, /CreatorOSDashboard/);
assert.doesNotMatch(overview, /Latest Activity/);
assert.match(overview, /Start Here|Featured Courses|Meet the Team|Community Rules/);
assert.match(overview, /grid-cols-12|max-w-\[1400px\]/);
assert.doesNotMatch(overview, /Join General/);
assert.doesNotMatch(overview, /Featured Groups|Featured Channels/);
assert.doesNotMatch(overview, /max-w-\[880px\]|max-w-2xl space-y-6/);
assert.match(chatRoom, /ConvertToTaskDialog/);
assert.match(messageCard, /Convert to Task/);
assert.match(memberProfile, /Knowledge contributions/);
assert.match(creatorTabs, /contributions/);
assert.match(creatorProfile, /contributions/);
assert.match(channelWs, /EventsPanel/);
assert.doesNotMatch(chatRoom, /fork ChatRoom/i);
assert.doesNotMatch(channelWs, /fork ChatRoom/i);

console.log("Creator collaboration OS verification passed.");
