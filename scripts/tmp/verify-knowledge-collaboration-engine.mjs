/**
 * Knowledge & Collaboration Engine (Phase 3) smoke checks — no network.
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

const types = mustExist("lib/community/workspace/types.ts");
const perms = mustExist("lib/community/workspace/permissions.ts");
const knTypes = mustExist("lib/community/knowledge/types.ts");
const knDerive = mustExist("lib/community/knowledge/derive.ts");
const knStore = mustExist("lib/community/knowledge/store.ts");
const knIndex = mustExist("lib/community/knowledge/index.ts");
const channel = mustExist(
  "components/community/workspace/channel/ChannelWorkspace.tsx"
);
const home = mustExist(
  "components/community/workspace/channel/panels/HomePanel.tsx"
);
const threads = mustExist(
  "components/community/workspace/channel/panels/ThreadsPanel.tsx"
);
const knowledge = mustExist(
  "components/community/workspace/channel/panels/KnowledgePanel.tsx"
);
const events = mustExist(
  "components/community/workspace/channel/panels/EventsPanel.tsx"
);
const ai = mustExist(
  "components/community/workspace/channel/panels/ChannelAiPanel.tsx"
);
const files = mustExist(
  "components/community/workspace/channel/panels/FilesPanel.tsx"
);
const convert = mustExist(
  "components/community/knowledge/ConvertToKnowledgeDialog.tsx"
);
const cardView = mustExist(
  "components/community/knowledge/KnowledgeCardView.tsx"
);
const chatRoom = mustExist("components/community/chat/ChatRoom.tsx");
const messageCard = mustExist(
  "components/community/chat/message-engine/MessageCard.tsx"
);
const searchBar = mustExist(
  "components/community/chat/message-engine/MessageSearchBar.tsx"
);
const msgExp = mustExist("lib/community/chat/message-experience.ts");
const roomIndex = mustExist("lib/community/chat/room-message-index.ts");

assert.match(types, /"knowledge"/);
assert.match(types, /"threads"/);
assert.match(types, /"home"/);
assert.match(types, /"events"/);
assert.match(types, /"ai"/);
assert.match(perms, /knowledge\.manage/);
assert.match(knTypes, /KnowledgeCard/);
assert.match(knTypes, /AnswerPick/);
assert.match(knTypes, /accepted/);
assert.match(knTypes, /verified/);
assert.match(knDerive, /organizeKnowledgeBuckets/);
assert.match(knDerive, /knowledgeFromThread/);
assert.match(knStore, /useCollaborationStore/);
assert.match(knStore, /convertMessage/);
assert.match(knStore, /markAnswer/);
assert.match(knIndex, /export/);
assert.match(channel, /HomePanel/);
assert.match(channel, /ThreadsPanel/);
assert.match(channel, /KnowledgePanel/);
assert.match(channel, /EventsPanel/);
assert.match(channel, /ChannelAiPanel/);
assert.match(home, /Resources & Knowledge|Pinned|Enter discussion/);
assert.match(home, /Channel overview|About/);
assert.match(threads, /Solved/);
assert.match(threads, /Featured/);
assert.match(threads, /→ Knowledge/);
assert.match(knowledge, /FAQs/);
assert.match(knowledge, /Learning Paths/);
assert.match(events, /Events/);
assert.match(ai, /Channel AI/);
assert.match(files, /FILE_CATEGORIES/);
assert.match(files, /Generate Quiz/);
assert.match(convert, /Convert to Knowledge/);
assert.match(cardView, /AnswerBadge/);
assert.match(chatRoom, /ConvertToKnowledgeDialog/);
assert.match(chatRoom, /markAnswer/);
assert.match(messageCard, /Convert to Knowledge/);
assert.match(messageCard, /ANSWER_PICKS/);
assert.match(searchBar, /knowledge/);
assert.match(searchBar, /courses/);
assert.match(searchBar, /products/);
assert.match(msgExp, /CollaborationDiscoveryScope|MessageSearchScope/);
assert.match(msgExp, /knowledge/);
assert.match(roomIndex, /requestOpenThread/);
assert.match(roomIndex, /requestConvertThread/);
assert.doesNotMatch(chatRoom, /fork ChatRoom/i);

console.log("Knowledge & collaboration engine verification passed.");
