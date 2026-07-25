/**
 * Creator Commerce Engine (Phase 5) smoke checks — no network.
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

const types = mustExist("lib/community/commerce/types.ts");
const helpers = mustExist("lib/community/commerce/helpers.ts");
const store = mustExist("lib/community/commerce/store.ts");
const index = mustExist("lib/community/commerce/index.ts");
const productCard = mustExist(
  "components/community/commerce/CommerceProductCard.tsx"
);
const courseCard = mustExist(
  "components/community/commerce/CommerceCourseCard.tsx"
);
const affiliateCard = mustExist(
  "components/community/commerce/CommerceAffiliateCard.tsx"
);
const bookingCard = mustExist(
  "components/community/commerce/CommerceBookingCard.tsx"
);
const donationCard = mustExist(
  "components/community/commerce/CommerceDonationCard.tsx"
);
const embed = mustExist(
  "components/community/commerce/MessageCommerceEmbed.tsx"
);
const attach = mustExist(
  "components/community/commerce/AttachCommerceDialog.tsx"
);
const communityStore = mustExist(
  "components/community/commerce/CommunityStorefront.tsx"
);
const creatorStore = mustExist(
  "components/community/commerce/CreatorStoreShelf.tsx"
);
const discovery = mustExist(
  "components/community/commerce/CommerceDiscovery.tsx"
);
const perms = mustExist("lib/community/workspace/permissions.ts");
const messageCard = mustExist(
  "components/community/chat/message-engine/MessageCard.tsx"
);
const chatRoom = mustExist("components/community/chat/ChatRoom.tsx");
const chatInput = mustExist("components/community/chat/ChatInputZone.tsx");
const useChat = mustExist("hooks/useChatRoom.ts");
const dashboard = mustExist(
  "components/community/os/CreatorOSDashboard.tsx"
);
const groupWs = mustExist(
  "components/community/workspace/group/GroupWorkspace.tsx"
);
const osTypes = mustExist("lib/community/os/types.ts");
const searchBar = mustExist(
  "components/community/chat/message-engine/MessageSearchBar.tsx"
);
const experience = mustExist("lib/community/chat/message-experience.ts");
const aiPanel = mustExist(
  "components/community/workspace/channel/panels/ChannelAiPanel.tsx"
);
const creatorProfile = mustExist(
  "components/creator-profile/CreatorProfilePage.tsx"
);
const creatorTabs = mustExist("lib/creator-profile/index.ts");
const channelWs = mustExist(
  "components/community/workspace/channel/ChannelWorkspace.tsx"
);

assert.match(types, /COMMERCE_KINDS/);
assert.match(types, /CommerceEmbed/);
assert.match(types, /product/);
assert.match(types, /course/);
assert.match(types, /affiliate/);
assert.match(types, /booking/);
assert.match(types, /donation/);
assert.match(helpers, /parseCommerceEmbed/);
assert.match(helpers, /filterMessagesByCommerceKind/);
assert.match(helpers, /buildAffiliateLink/);
assert.match(store, /useCreatorCommerceStore/);
assert.match(store, /featureInCommunity/);
assert.match(store, /trackAffiliateClick/);
assert.match(index, /export/);
assert.match(productCard, /Buy Now/);
assert.match(productCard, /addToCart/);
assert.match(courseCard, /Continue Learning|Enroll/);
assert.match(affiliateCard, /trackAffiliateClick/);
assert.match(bookingCard, /Mentorship|Schedule Call/);
assert.match(donationCard, /Support Creator|Monthly Membership/);
assert.match(embed, /MessageCommerceEmbed/);
assert.match(attach, /AttachCommerceDialog/);
assert.match(communityStore, /CommunityStorefront/);
assert.match(communityStore, /Featured products/);
assert.match(creatorStore, /CreatorStoreShelf/);
assert.match(discovery, /CommerceDiscovery/);
assert.match(perms, /commerce\.manage/);
assert.match(messageCard, /MessageCommerceEmbed/);
assert.match(messageCard, /parseCommerceEmbed/);
assert.match(chatRoom, /AttachCommerceDialog/);
assert.match(chatRoom, /sendCommerceMessage/);
assert.match(chatInput, /onAttachCommerce/);
assert.match(useChat, /sendCommerceMessage/);
assert.match(dashboard, /Marketplace picks/);
assert.match(dashboard, /CommunityStorefront/);
assert.match(osTypes, /"store"/);
assert.match(groupWs, /ChatRoom|SpaceAboutPanel/);
assert.match(osTypes, /"store"/);
assert.match(searchBar, /affiliates/);
assert.match(searchBar, /services/);
assert.match(experience, /"affiliates"/);
assert.match(aiPanel, /Recommend products/);
assert.match(creatorProfile, /CreatorStoreShelf/);
assert.match(creatorTabs, /id: "store"/);

assert.doesNotMatch(chatRoom, /fork ChatRoom/i);
assert.doesNotMatch(channelWs, /fork ChatRoom/i);
assert.doesNotMatch(embed, /useChatRoom/);

console.log("Creator commerce engine verification passed.");
