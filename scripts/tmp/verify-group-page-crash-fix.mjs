/**
 * Guard against Group page infinite-re-render crash from zustand selectors.
 * Groups are discussion-first — ChatRoom is primary; OS store selectors must stay stable.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function read(rel) {
  const p = path.join(root, rel);
  assert.ok(fs.existsSync(p), `missing ${rel}`);
  return fs.readFileSync(p, "utf8");
}

const groupWs = read("components/community/workspace/group/GroupWorkspace.tsx");
const groupPage = read(
  "components/community/workspace/group/GroupWorkspacePage.tsx"
);
const eventsPanel = read(
  "components/community/workspace/channel/panels/EventsPanel.tsx"
);
const eventsSection = read(
  "components/community/workspace/sections/EventsSection.tsx"
);
const groupError = read(
  "app/communities/(hubs)/[slug]/groups/[groupSlug]/error.tsx"
);

// Must NOT return fresh .filter() arrays from zustand selectors
assert.doesNotMatch(
  groupWs,
  /useCreatorOSStore\(\(s\)\s*=>\s*\n?\s*s\.tasks\.filter/s
);
assert.doesNotMatch(
  groupWs,
  /useCreatorOSStore\(\(s\)\s*=>\s*\n?\s*s\.events\.filter/s
);
assert.doesNotMatch(
  groupWs,
  /useCollaborationStore\(\(s\)\s*=>\s*\n?\s*s\.cards\.filter/s
);
assert.match(groupWs, /ChatRoom/);
assert.match(groupWs, /SpaceAboutPanel/);
assert.match(groupWs, /hideSidebar/);

assert.doesNotMatch(
  eventsPanel,
  /useCreatorOSStore\(\(s\)\s*=>\s*\n?\s*roomId \? s\.events\.filter/s
);
assert.match(eventsPanel, /const allEvents = useCreatorOSStore/);

assert.doesNotMatch(
  eventsSection,
  /useCreatorOSStore\(\(s\)\s*=>\s*\n?\s*s\.events\.filter/s
);

assert.match(groupPage, /Space not found|Group not found/);
assert.match(groupPage, /resolveSpace/);
assert.match(groupError, /Space failed to load|Group failed to load/);
assert.match(groupError, /error\.message/);

console.log("Group page crash-fix verification passed.");
