/**
 * Live Collaboration Suite (Phase 6) smoke checks — no network.
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

const types = mustExist("lib/community/live-collab/types.ts");
const helpers = mustExist("lib/community/live-collab/helpers.ts");
const store = mustExist("lib/community/live-collab/store.ts");
const index = mustExist("lib/community/live-collab/index.ts");
const whiteboard = mustExist(
  "components/community/live-collab/LiveWhiteboard.tsx"
);
const notes = mustExist(
  "components/community/live-collab/LiveSharedNotes.tsx"
);
const reactions = mustExist(
  "components/community/live-collab/LiveReactionsBar.tsx"
);
const knowledge = mustExist(
  "components/community/live-collab/LiveKnowledgeCapture.tsx"
);
const commerce = mustExist(
  "components/community/live-collab/LiveCommerceRail.tsx"
);
const recording = mustExist(
  "components/community/live-collab/LiveRecordingPanel.tsx"
);
const tools = mustExist(
  "components/community/live-collab/LiveCreatorTools.tsx"
);
const shareMenu = mustExist(
  "components/community/live-collab/ScreenShareMenu.tsx"
);
const roomTypes = mustExist(
  "components/community/live-collab/LiveRoomTypePicker.tsx"
);
const engagement = mustExist(
  "components/community/live-collab/LiveEngagementPanels.tsx"
);
const panels = mustExist(
  "components/community/live-collab/LiveCollabPanels.tsx"
);
const studioTypes = mustExist(
  "components/community/hub/live/studio-types.ts"
);
const hubLive = mustExist("components/community/hub/hub-live-page.tsx");
const liveChat = mustExist("hooks/live/useLiveChat.ts");
const mediaPlane = mustExist("lib/live/media-plane.ts");
const liveSection = mustExist(
  "components/community/workspace/sections/LiveSection.tsx"
);
const perms = mustExist("lib/community/workspace/permissions.ts");
const aiFab = mustExist("components/community/hub/live/AiFab.tsx");
const chatRoom = mustExist("components/community/chat/ChatRoom.tsx");

assert.match(types, /LIVE_ROOM_TYPES/);
assert.match(types, /live_shopping/);
assert.match(types, /WhiteboardStroke/);
assert.match(types, /LiveSharedNotes/);
assert.match(types, /LiveRecordingMeta/);
assert.match(helpers, /liveChatToMsg/);
assert.match(helpers, /displaySurfaceConstraint/);
assert.match(store, /useLiveCollabStore/);
assert.match(store, /addStroke/);
assert.match(store, /updateNotes/);
assert.match(store, /toggleHand/);
assert.match(index, /export/);
assert.match(whiteboard, /Export/);
assert.match(notes, /History/);
assert.match(reactions, /Raise hand/);
assert.match(knowledge, /Session summary/);
assert.match(commerce, /LiveCommerceRail/);
assert.match(recording, /transcriptPlaceholder|Transcript/);
assert.match(tools, /Waiting room/);
assert.match(shareMenu, /Presenter mode/);
assert.match(roomTypes, /LIVE_ROOM_TYPE_LABELS/);
assert.match(engagement, /LiveQaCollabPanel/);
assert.match(panels, /LiveWhiteboardLazy/);
assert.match(studioTypes, /whiteboard/);
assert.match(studioTypes, /knowledge/);
assert.match(studioTypes, /commerce/);
assert.match(hubLive, /LiveWhiteboardLazy/);
assert.match(hubLive, /LiveKnowledgeCapture/);
assert.match(hubLive, /LiveCommerceRail/);
assert.match(hubLive, /LiveReactionsBar/);
assert.match(liveChat, /useRoomMessageIndex/);
assert.match(liveChat, /liveChatToMsg/);
assert.match(mediaPlane, /displaySurface/);
assert.match(liveSection, /Open Live Studio/);
assert.match(perms, /live\.manage/);
assert.match(aiFab, /Session summary/);

assert.doesNotMatch(hubLive, /fork ChatRoom/i);
assert.doesNotMatch(liveChat, /new WebSocket/i);
assert.doesNotMatch(whiteboard, /useChatRoom/);
assert.ok(fs.existsSync(path.join(root, "components/community/chat/ChatRoom.tsx")));
assert.match(chatRoom, /MessageCard|message-engine/);

console.log("Live collaboration suite verification passed.");
