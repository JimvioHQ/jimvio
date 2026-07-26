/**
 * Hub Messages experience smoke checks — no network.
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

const page = mustExist("components/community/hub/hub-messages-page.tsx");
const index = mustExist("components/community/hub/messages/index.ts");
mustExist("components/community/hub/messages/ThreadSidebar.tsx");
mustExist("components/community/hub/messages/ChatHeader.tsx");
mustExist("components/community/hub/messages/MessageBubble.tsx");
mustExist("components/community/hub/messages/MessageTimeline.tsx");
mustExist("components/community/hub/messages/MessagesComposer.tsx");
mustExist("components/community/hub/messages/ChatDetailsAside.tsx");
mustExist("components/community/hub/messages/ShareActionSheet.tsx");
mustExist("app/api/c/messages/read/route.ts");
mustExist("database/migrations/104_messaging_conversation_reads.sql");
mustExist("supabase/migrations/20260725231240_messaging_conversation_reads.sql");

assert.match(page, /ThreadSidebar/);
assert.match(page, /MessagesComposer/);
assert.match(page, /ChatDetailsAside/);
assert.match(page, /useConversationMessages/);
assert.match(page, /useHubChatPresence/);
assert.match(index, /ThreadSidebar/);
assert.match(index, /MessagesComposer/);

console.log("verify-hub-messages-experience: ok");
