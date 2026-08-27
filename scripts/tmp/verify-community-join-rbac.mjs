/**
 * Static verification: Community join/invite/RBAC/announcement/IDOR hardening.
 * Auto-picked up by npm test via scripts/tmp/verify-*.mjs
 * No network / no secrets.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const joinPolicy = read("lib/community/join-policy.ts");
const rbac = read("lib/community/rbac.ts");
const service = read("services/communityService.ts");
const joinRoute = read("app/api/communities/[slug]/join/route.ts");
const feed = read("app/api/posts/feed/route.ts");
const assertPublish = read("lib/community/workspace/assert-can-publish.ts");
const posting = read("lib/community/workspace/channel-posting.ts");
const emptyCopy = read("lib/community/workspace/channel-empty-copy.ts");
const detail = read("components/community/community-detail-view.tsx");
const requestPage = read("app/communities/(hubs)/[slug]/request/page.tsx");
const eventsRedirect = read("app/communities/(hubs)/[slug]/events/page.tsx");
const moderation = read(
  "app/communities/(hubs)/community/creator/moderation/page.tsx"
);
const createCommunity = read("app/api/communities/route.ts");
const migration = read("database/migrations/132_community_join_announcement_rls.sql");
const supabaseTwin = read(
  "supabase/migrations/20260826160000_community_join_announcement_rls.sql"
);
const roomBind = read("lib/community/assert-room-community.ts");

assert.match(joinPolicy, /export function resolveCommunityJoinVisibility/);
assert.match(joinPolicy, /communityIsPubliclyDiscoverable/);
assert.match(joinPolicy, /communityIsRestrictedToMembers/);
assert.match(joinPolicy, /invite_only/);
assert.match(joinPolicy, /communityAcceptsInstantJoin/);
assert.match(joinPolicy, /communityRequiresInvite/);
assert.match(joinPolicy, /communityRequiresApproval/);

assert.match(rbac, /export async function requireCommunityMember/);
assert.match(rbac, /export async function requireCommunityModerator/);
assert.match(rbac, /export async function requireCommunityAdmin/);
assert.match(rbac, /export async function requireCommunityOwner/);
assert.match(rbac, /resolveWorkspaceRole/);
assert.match(rbac, /hasCapability/);
assert.doesNotMatch(rbac, /req\.body\.role|body\.owner_id/);

assert.match(service, /communityRequiresInvite/);
assert.match(service, /submitJoinRequest/);
assert.match(service, /redeemCommunityInvite/);
assert.match(service, /You are banned from this community/);
assert.match(service, /community_join_requests/);
assert.match(service, /community_invites/);
assert.match(service, /cannot self-assign|safeRole/);

assert.match(joinRoute, /inviteCode/);
assert.match(joinRoute, /pending: true/);
assert.match(joinRoute, /user\.email/);
assert.match(joinRoute, /export async function GET/);

assert.match(feed, /requireCommunityMember/);
assert.match(feed, /roomBelongsToCommunity/);
assert.match(feed, /Invalid room/);

assert.match(roomBind, /room\.community_id !== communityId/);

assert.match(assertPublish, /muted_until/);
assert.match(assertPublish, /timeout_until/);
assert.match(assertPublish, /suspended_until/);
assert.match(assertPublish, /restrictionUntil/);

assert.match(posting, /export function isAnnouncementOnlyRoom/);
assert.match(posting, /channel_kind === "announcement"/);

assert.match(emptyCopy, /Announcements only/);
assert.match(emptyCopy, /Members can read/);

assert.match(detail, /Request to join/);
assert.match(detail, /Redeem invitation/);
assert.match(detail, /Request pending/);
assert.doesNotMatch(
  detail,
  /There is no separate pending-approval table in production yet/
);

assert.match(requestPage, /join request/);
assert.match(eventsRedirect, /community=\$\{encodeURIComponent\(slug\)\}/);
assert.match(moderation, /ownerConsoleHref/);
assert.match(moderation, /moderation/);

assert.match(createCommunity, /owner_id: user\.id/);
assert.doesNotMatch(createCommunity, /owner_id: body\.owner_id/);

assert.match(migration, /community_room_is_announcement_only/);
assert.match(migration, /memberships_insert_self_public_free_only/);
assert.match(migration, /guard_membership_privilege_escalation/);
assert.match(migration, /community_join_requests_insert_self/);
assert.match(migration, /community_posts_insert/);
assert.match(migration, /community_messages_insert/);
assert.match(migration, /visibility_mode/);
assert.doesNotMatch(migration, /\bDROP TABLE\b/);
assert.equal(migration, supabaseTwin);

console.log("verify-community-join-rbac: ok");
