/**
 * Communities UX polish smoke checks — no network.
 * Locks theme tokens, overflow, and accessibility on the audited surfaces.
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

const feedPage = mustExist("components/feed/FeedPageContent.tsx");
assert.match(feedPage, /bg-\[var\(--color-bg\)\]/);
assert.doesNotMatch(feedPage, /from-\[#FFF8F5\]/);

const feedTabs = mustExist("components/feed/FeedTabs.tsx");
assert.match(feedTabs, /role="tablist"/);
assert.match(feedTabs, /role="tab"/);
assert.match(feedTabs, /aria-selected/);
assert.match(feedTabs, /ArrowRight/);
assert.match(feedTabs, /min-h-11/);

const feedCard = mustExist("components/feed/FeedPostCard.tsx");
assert.match(feedCard, /Unable to load the community feed/);
assert.match(feedCard, /No public posts yet/);
assert.match(feedCard, /Loading your community feed/);
assert.match(feedCard, /aria-pressed=/);
assert.match(feedCard, /aria-label=\{`Comments/);
assert.match(feedCard, /min-w-0 break-words/);
assert.match(feedCard, /pl-0 sm:pl-\[52px\]/);

const hub = mustExist("components/community/hub/hub-community-overview.tsx");
assert.match(hub, /bg-\[var\(--color-bg\)\]/);
assert.match(hub, /min-w-0 break-words/);
assert.match(hub, /aria-current=/);
assert.match(hub, /aria-busy=\{joining\}/);
assert.doesNotMatch(hub, /#f8fafc/);
assert.match(hub, /Joined|Join Community/);

const home = mustExist("components/community/hub/community-overview-home.tsx");
assert.match(home, /bg-\[var\(--color-surface\)\]/);
assert.match(home, /break-words/);
assert.doesNotMatch(home, /Community Activity/);

const feedUi = mustExist("components/community/workspace/sections/Feed.tsx");
assert.match(feedUi, /min-w-0 break-words/);
assert.match(feedUi, /What.?s on your mind/);
assert.match(feedUi, /From Jimvio|promotionLabel/);

const discover = mustExist("components/community/communities-discovery.tsx");
assert.match(discover, /min-h-11/);
assert.match(discover, /aria-current=\{active \? "page"/);
assert.match(discover, /aria-label="Search communities"/);

const cards = mustExist("components/community/community-card-shared.tsx");
assert.match(cards, /line-clamp-2/);
assert.match(cards, /min-h-11/);
assert.match(cards, /focus-visible:ring/);

const search = mustExist("components/feed/FeedSearchBar.tsx");
assert.match(search, /bg-\[var\(--color-surface\)\]/);
assert.match(search, /aria-label="Open command search"/);

const sidebar = mustExist("components/shell/CommunitySidebar.tsx");
assert.match(sidebar, /aria-current=/);
assert.match(sidebar, /min-h-11/);
assert.match(sidebar, /var\(--color-surface-secondary\)/);

const chatInput = mustExist("components/community/chat/ChatInputZone.tsx");
assert.match(chatInput, /bg-\[var\(--color-surface\)\]\/95/);
assert.match(chatInput, /aria-label="Send message"/);

const messageCard = mustExist("components/community/chat/message-engine/MessageCard.tsx");
assert.match(messageCard, /bg-\[var\(--color-surface\)\]/);
assert.match(messageCard, /break-words/);

const layout = mustExist("app/communities/components/Layout.tsx");
assert.match(layout, /aria-expanded=\{mobileNavOpen\}/);
assert.match(layout, /aria-current=\{active \? "page"/);
assert.match(layout, /min-w-0 break-words/);

const chatRoom = mustExist("components/community/chat/ChatRoom.tsx");
assert.match(chatRoom, /bg-\[var\(--color-surface\)\]/);
assert.match(chatRoom, /break-words/);
assert.match(chatRoom, /aria-label="Messages"/);

const groupWorkspace = mustExist("components/community/workspace/group/GroupWorkspace.tsx");
assert.match(groupWorkspace, /bg-\[var\(--color-surface\)\]/);
assert.match(groupWorkspace, /ring-\[var\(--color-border\)\]/);

const groupHeader = mustExist("components/community/workspace/group/GroupHeader.tsx");
assert.match(groupHeader, /bg-\[var\(--color-surface\)\]\/90/);
assert.match(groupHeader, /focus-visible:ring/);

const composer = mustExist("components/feed/PostComposer.tsx");
assert.match(composer, /bg-\[var\(--color-surface\)\]/);
assert.match(composer, /bg-\[var\(--color-surface-secondary\)\]/);

const origin = mustExist("lib/community/editorial-origin.ts");
assert.match(origin, /From Jimvio/);

console.log("verify-community-ux-polish: ok");
