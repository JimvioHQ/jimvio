/**
 * Flagship Groups/Channels UX — experience layer smoke checks.
 * Groups are discussion-first (live ChatRoom), Overview is secondary.
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

const groupCard = mustExist(
  "components/community/workspace/group/GroupCard.tsx"
);
const channelCard = mustExist(
  "components/community/workspace/channel/ChannelCard.tsx"
);
const groupWs = mustExist(
  "components/community/workspace/group/GroupWorkspace.tsx"
);
const empty = mustExist(
  "components/community/workspace/channel/ChannelEmptyState.tsx"
);
const actions = mustExist(
  "components/community/workspace/shared/WorkspaceActionMenu.tsx"
);
const header = mustExist(
  "components/community/workspace/channel/ChannelHeader.tsx"
);

assert.match(groupCard, /Enter workspace/);
assert.match(groupCard, /WorkspaceActionMenu/);
assert.match(groupCard, /isVerified|Verified/);
assert.match(groupCard, /hover preview|group-hover:opacity/i);

assert.match(channelCard, /TYPE_META|resolveMeta/);
assert.match(channelCard, /signals/);
assert.match(channelCard, /typingLabel/);
assert.match(channelCard, /WorkspaceActionMenu/);

// Pure conversation Space homepage
assert.match(groupWs, /ChatRoom/);
assert.match(groupWs, /hideSidebar/);
assert.match(groupWs, /SpaceAboutPanel/);
assert.match(groupWs, /Welcome to \$\{group\.name\}/);
assert.match(groupWs, /Start the first conversation/);
assert.doesNotMatch(groupWs, /GroupSidebar/);
assert.doesNotMatch(groupWs, /Featured resources/);
assert.doesNotMatch(groupWs, /Quick actions/);
assert.doesNotMatch(groupWs, /Pinned announcement/);

assert.match(empty, /WorkspaceEmptyArt|emoji/);
assert.match(actions, /buildWorkspaceActions/);
assert.match(actions, /Copy link/);
assert.match(header, /WorkspaceActionMenu/);

console.log("Flagship collaboration UX verification passed.");
