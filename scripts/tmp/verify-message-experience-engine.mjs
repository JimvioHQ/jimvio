/**
 * Message Experience Engine (Phase 2) smoke checks — no network.
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

const helpers = mustExist("lib/community/chat/message-experience.ts");
const index = mustExist("lib/community/chat/room-message-index.ts");
const bookmarks = mustExist("lib/community/chat/message-bookmarks.ts");
const card = mustExist(
  "components/community/chat/message-engine/MessageCard.tsx"
);
const virt = mustExist(
  "components/community/chat/message-engine/VirtualMessageList.tsx"
);
const ai = mustExist(
  "components/community/chat/message-engine/MessageAiPanel.tsx"
);
const search = mustExist(
  "components/community/chat/message-engine/MessageSearchBar.tsx"
);
const files = mustExist(
  "components/community/chat/message-engine/FileAttachmentCard.tsx"
);
const engineIndex = mustExist(
  "components/community/chat/message-engine/index.ts"
);
const chatRoom = mustExist("components/community/chat/ChatRoom.tsx");
const messageRow = mustExist("components/community/chat/MessageRow.tsx");
const composer = mustExist("components/community/chat/ChatInputZone.tsx");
const thread = mustExist("components/community/chat/ThreadPanel.tsx");
const channel = mustExist(
  "components/community/workspace/channel/ChannelWorkspace.tsx"
);
const pinned = mustExist(
  "components/community/workspace/channel/panels/PinnedPanel.tsx"
);
const filesPanel = mustExist(
  "components/community/workspace/channel/panels/FilesPanel.tsx"
);
const mediaPanel = mustExist(
  "components/community/workspace/channel/panels/MediaPanel.tsx"
);

assert.match(helpers, /parseRichText/);
assert.match(helpers, /classifyFile/);
assert.match(helpers, /extractPinned/);
assert.match(helpers, /MessageSearchScope/);
assert.match(index, /useRoomMessageIndex/);
assert.match(index, /sync/);
assert.match(bookmarks, /toggleBookmark/);
assert.match(card, /MessageCard/);
assert.match(card, /BadgeCheck/);
assert.match(card, /ThreadPreview/);
assert.match(virt, /useVirtualizer/);
assert.match(virt, /VirtualMessageList/);
assert.match(ai, /MessageAiPanel/);
assert.match(ai, /summarize/);
assert.match(search, /MessageSearchBar/);
assert.match(search, /members/);
assert.match(files, /FileAttachmentCard/);
assert.match(files, /isTrustedChatMediaUrl|sandbox/);
assert.match(engineIndex, /export/);
assert.match(chatRoom, /VirtualMessageList/);
assert.match(chatRoom, /MessageAiPanel/);
assert.match(chatRoom, /useRoomMessageIndex/);
assert.match(chatRoom, /MessageSearchBar/);
assert.match(chatRoom, /@\/components\/ui\/dialog/);
assert.doesNotMatch(chatRoom, /@radix-ui\/react-dialog/);
assert.doesNotMatch(chatRoom, /fork ChatRoom/i);
assert.match(messageRow, /MessageCard/);
assert.match(composer, /onDrop/);

const sanitize = mustExist("lib/community/chat/sanitize-attachments.ts");
assert.match(sanitize, /sanitizeChatAttachments/);
assert.match(sanitize, /escapeIlikePattern/);
assert.match(sanitize, /isTrustedChatMediaUrl/);

const hook = mustExist("hooks/useChatRoom.ts");
assert.match(hook, /useConversationMessages/);
assert.match(hook, /setActiveChatTarget/);
assert.match(hook, /loadOlder/);
assert.match(hook, /hasMore/);
assert.doesNotMatch(hook, /return \(\) => controller\.abort\(\);\s*\}, \[roomId/);

const convHook = mustExist("hooks/useConversationMessages.ts");
assert.match(convHook, /subscribePostgresChangesMany/);
assert.match(convHook, /fetchConversationPage/);
assert.match(convHook, /loadOlder/);

const convHelpers = mustExist("lib/community/chat/conversation-messages.ts");
assert.match(convHelpers, /mergeMessages/);
assert.match(convHelpers, /nextCursor|before/);

const unreadSync = mustExist("hooks/useWorkspaceUnreadSync.ts");
assert.match(unreadSync, /shell_unread_/);
assert.match(unreadSync, /subscribePostgresChangesMany/);
assert.match(unreadSync, /bumpWorkspaceUnread/);

const shell = mustExist("components/community/workspace/WorkspaceShell.tsx");
assert.match(shell, /WorkspaceUnreadSync/);

assert.match(virt, /onLoadOlder/);
assert.match(virt, /hasMore/);

const inboxDialog = mustExist("components/community/chat/community-inbox-dialog.tsx");
assert.match(inboxDialog, /useConversationMessages/);

const realtime = mustExist("lib/supabase/realtime-subscribe.ts");
assert.match(realtime, /subscribePostgresChangesMany/);

const messagesApi = mustExist("app/api/messages/[roomId]/route.ts");
assert.match(messagesApi, /sanitizeChatAttachments/);

const inboxMessagesApi = mustExist(
  "app/api/communities/[slug]/inbox/[conversationId]/messages/route.ts"
);
assert.match(inboxMessagesApi, /sanitizeChatAttachments/);
assert.match(inboxMessagesApi, /resolveCommunityBySlugOrId/);
assert.match(inboxMessagesApi, /nextCursor/);

const resolveCommunity = mustExist("lib/community/resolve-community.ts");
assert.match(resolveCommunity, /resolveCommunityBySlugOrId/);
assert.match(composer, /onPaste/);
assert.match(composer, /Sparkles/);
assert.match(thread, /Solved/);
assert.match(thread, /Pinned/);
assert.match(channel, /roomId/);
assert.match(channel, /FilesPanel/);
assert.match(pinned, /Jump to message/);
assert.match(pinned, /useRoomMessageIndex/);
assert.match(filesPanel, /FileAttachmentCard/);
assert.match(mediaPanel, /extractMediaItems/);

console.log("Message experience engine verification passed.");
