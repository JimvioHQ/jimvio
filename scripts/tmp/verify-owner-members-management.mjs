/**
 * Community Owner Members Management smoke checks — no network.
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

const migration = mustExist(
  "database/migrations/097_owner_members_management.sql"
);
const types = mustExist("lib/community/owner-console/members/types.ts");
const constants = mustExist("lib/community/owner-console/members/constants.ts");
const auth = mustExist("lib/community/owner-console/members/auth.ts");
const mappers = mustExist("lib/community/owner-console/members/mappers.ts");
const membersIndex = mustExist("lib/community/owner-console/members/index.ts");
const perms = mustExist("lib/community/workspace/permissions.ts");
const apiList = mustExist("app/api/c/owner/members/route.ts");
const apiOne = mustExist("app/api/c/owner/members/[id]/route.ts");
const apiActions = mustExist("app/api/c/owner/members/[id]/actions/route.ts");
const apiBulk = mustExist("app/api/c/owner/members/bulk/route.ts");
const apiInvites = mustExist("app/api/c/owner/members/invites/route.ts");
const apiJoin = mustExist("app/api/c/owner/members/join-requests/route.ts");
const apiAnalytics = mustExist("app/api/c/owner/members/analytics/route.ts");
const page = mustExist(
  "app/dashboard/communities/[communitySlug]/members/page.tsx"
);
const management = mustExist(
  "components/community/owner-console/members/MembersManagement.tsx"
);
const list = mustExist(
  "components/community/owner-console/members/MembersList.tsx"
);
const overview = mustExist(
  "components/community/owner-console/members/MembersOverview.tsx"
);
const panel = mustExist(
  "components/community/owner-console/members/MemberProfilePanel.tsx"
);
const invite = mustExist(
  "components/community/owner-console/members/InviteMembersWizard.tsx"
);
const joinPanel = mustExist(
  "components/community/owner-console/members/JoinRequestsPanel.tsx"
);
const analytics = mustExist(
  "components/community/owner-console/members/MembersAnalyticsPanel.tsx"
);
const hook = mustExist(
  "components/community/owner-console/members/useOwnerMembers.ts"
);

assert.match(migration, /community_invites/);
assert.match(migration, /community_join_requests/);
assert.match(migration, /community_member_notes/);
assert.match(migration, /community_moderation_logs/);
assert.match(migration, /muted_until/);
assert.match(types, /OwnerMemberListItem/);
assert.match(types, /OwnerMemberAction/);
assert.match(types, /MEMBER_PROFILE_TABS/);
assert.match(types, /OwnerJoinRequest/);
assert.match(constants, /MEMBER_STATUS_LABELS/);
assert.match(constants, /randomInviteCode/);
assert.match(auth, /resolveMemberManageContext/);
assert.match(auth, /members\.view/);
assert.match(auth, /canManageTarget/);
assert.match(mappers, /mapMembershipToOwnerMember/);
assert.match(membersIndex, /export/);
assert.match(perms, /members\.manage/);
assert.match(perms, /members\.ban/);
assert.match(perms, /members\.remove/);
assert.match(perms, /members\.role/);
assert.match(apiList, /export async function GET/);
assert.match(apiList, /overview/);
assert.match(apiOne, /export async function GET/);
assert.match(apiActions, /export async function POST/);
assert.match(apiActions, /change_role/);
assert.match(apiActions, /mute/);
assert.match(apiActions, /ban/);
assert.match(apiBulk, /assign_role/);
assert.match(apiBulk, /export/);
assert.match(apiInvites, /export async function POST/);
assert.match(apiInvites, /mapInviteRow|community_invites/);
assert.match(apiJoin, /approve/);
assert.match(apiJoin, /reject/);
assert.match(apiAnalytics, /OwnerMemberAnalytics|topContributors/);
assert.match(page, /sectionId="members"/);
assert.match(page, /MembersManagement/);
assert.match(management, /Invite Members/);
assert.match(management, /Bulk|selected/);
assert.match(management, /Join Requests/);
assert.match(list, /useVirtualizer/);
assert.match(overview, /Total Members/);
assert.match(panel, /MEMBER_PROFILE_TABS/);
assert.match(invite, /QR|invite/);
assert.match(joinPanel, /Bulk Approve/);
assert.match(analytics, /Member Growth|Top Contributors/);
assert.match(hook, /useOwnerMembers/);

console.log("Community owner members management verification passed.");
