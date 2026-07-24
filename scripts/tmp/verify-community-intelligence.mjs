/**
 * Creator Community Intelligence layer — smoke checks.
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

const store = mustExist("lib/community/personalization/store.ts");
const derive = mustExist("lib/community/personalization/derive.ts");
const types = mustExist("lib/community/personalization/types.ts");
const home = mustExist(
  "components/community/personalization/PersonalizedHome.tsx"
);
const bookmarkBtn = mustExist(
  "components/community/personalization/BookmarkButton.tsx"
);
const visit = mustExist(
  "components/community/personalization/VisitTracker.tsx"
);
const overview = mustExist(
  "components/community/hub/hub-community-overview.tsx"
);
const groupPage = mustExist(
  "components/community/workspace/group/GroupWorkspacePage.tsx"
);
const channelPage = mustExist(
  "components/community/workspace/channel/ChannelWorkspacePage.tsx"
);
const notifUtils = mustExist("lib/notifications/ui-utils.ts");
const search = mustExist("components/community/hub/HubSearchDialog.tsx");

assert.match(store, /jimvio-personalization-v1/);
assert.match(store, /trackVisit|toggleBookmark|pushActivity/);
assert.match(derive, /deriveContinueDiscussion|deriveRecommendations|deriveDiscovery/);
assert.match(types, /NOTIFICATION_PRIORITY_ORDER|notificationPriorityWeight/);
assert.match(home, /Continue Learning|Continue Discussion|Suggested for you/);
assert.match(home, /Your recent activity|Saved items/);
assert.match(bookmarkBtn, /BookmarkButton/);
assert.match(visit, /setContinueLearning|trackVisit/);
assert.match(overview, /PersonalizedHome/);
assert.match(overview, /dynamic\(/);
assert.doesNotMatch(overview, /workspace-room-view|workspace-room-overlay/);
assert.match(groupPage, /VisitTracker/);
assert.match(channelPage, /VisitTracker|continueLearning/);
assert.match(notifUtils, /sortNotificationsByPriority|classifyCommunityNotificationPriority/);
assert.match(search, /Groups|Channels/);

// Must not touch ChatRoom / APIs / routing for this layer
assert.doesNotMatch(home, /from ["']@\/components\/community\/chat\/ChatRoom/);
assert.doesNotMatch(visit, /fetch\(|\/api\//);

console.log("Creator community intelligence verification passed.");
