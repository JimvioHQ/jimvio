/**
 * Premium Community Space UI smoke checks — no network.
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

const header = mustExist(
  "components/community/workspace/group/GroupHeader.tsx"
);
assert.match(header, /lastActivityLabel/);
assert.match(header, /privacyLabel|Public|Private/);
assert.match(header, /memberCountLabel|member/);
assert.match(header, /group\.name/);
assert.doesNotMatch(header, /Created \$\{/);
assert.doesNotMatch(header, /typeLabel/);

const chrome = mustExist(
  "components/community/workspace/space/SpaceViewChrome.tsx"
);
assert.match(chrome, /Discussion/);
assert.match(chrome, /Members/);
assert.match(chrome, /Files/);
assert.match(chrome, /Posts/);
assert.match(chrome, /About/);

const workspace = mustExist(
  "components/community/workspace/group/GroupWorkspace.tsx"
);
assert.match(workspace, /Start Discussion|Read Only/);
assert.match(workspace, /Start the first conversation/);
assert.match(workspace, /lastActivityLabel/);

const chat = mustExist("components/community/chat/ChatRoom.tsx");
assert.match(chat, /canPost \?/);
assert.match(chat, /Read Only/);

const input = mustExist("components/community/chat/ChatInputZone.tsx");
assert.match(input, /Write a message/);
assert.match(input, /var\(--color-accent\)/);
assert.doesNotMatch(input, /bg-violet-500/);

const about = mustExist(
  "components/community/workspace/space/SpaceAboutPanel.tsx"
);
assert.match(about, /InfoCard|About/);
assert.match(about, /pinnedFiles/);
assert.match(about, /upcomingEvents/);

const css = mustExist("styles/globals.css");
assert.match(css, /discussion-chat-canvas/);
assert.doesNotMatch(css, /#f3f0ff/);

console.log("verify-community-space-premium-ui: ok");
