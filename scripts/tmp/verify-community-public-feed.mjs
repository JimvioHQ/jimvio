/**
 * Public community discovery + feed visibility.
 * Auto-picked up by npm test via scripts/tmp/verify-*.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const joinPolicy = read("lib/community/join-policy.ts");
const feed = read("app/api/posts/feed/route.ts");
const communities = read("app/api/communities/route.ts");
const discover = read("app/api/c/hub/discover/route.ts");
const platform = read("services/platform.ts");
const feedCard = read("components/feed/FeedPostCard.tsx");
const explore = read("app/communities/(discovery)/explore/page.tsx");
const rbac = read("lib/community/rbac.ts");
const roomBind = read("lib/community/assert-room-community.ts");
const publicRls = read("supabase/migrations/20260821120000_public_community_read_rls.sql");
const postsRls = read("supabase/migrations/20260725084933_community_posts_production_rls.sql");

const feedGet = feed.slice(0, feed.indexOf("export async function POST"));

// 1–4, 17: guests and signed-in users can read public discovery.
assert.match(feedGet, /if \(!user\) return getPublicDiscoveryFeed\(req, supabase\)/);
assert.doesNotMatch(feedGet, /if \(!user\) return NextResponse.json\(\{ error: "Unauthorized" \}/);
assert.doesNotMatch(feedGet, /if \(!user\) return NextResponse.json\(\{ posts: \[\]/);
assert.match(explore, /getPublicCommunities/);
assert.match(platform, /communityIsPubliclyDiscoverable/);
assert.match(communities, /communityIsPubliclyDiscoverable/);

// 5–6: signed-in with zero memberships still loads public IDs; members keep union.
assert.match(feedGet, /membershipIds, \.\.\.publicCommunityIds/);
assert.match(feedGet, /loadPublicCommunityIds/);

// 7–9: private / invite_only / hidden stay out of public discovery.
assert.match(joinPolicy, /communityIsPubliclyDiscoverable/);
assert.match(joinPolicy, /invite_only/);
assert.match(joinPolicy, /hidden/);
assert.match(feed, /communityIsPubliclyDiscoverable/);
assert.match(discover, /communityIsPubliclyDiscoverable/);

// 10–12: public feed only published, not archived, public-or-null audience.
assert.match(feedGet, /\.eq\("is_published", true\)/);
assert.match(feedGet, /\.is\("archived_at", null\)/);
assert.match(feedGet, /!audience \|\| audience === "public"/);
assert.match(publicRls, /audience IS NULL OR audience = 'public'/);
assert.match(publicRls, /COALESCE\(is_published, false\) = true/);
assert.match(publicRls, /archived_at IS NULL/);

// 13: writes stay room-bound.
assert.match(feed, /roomBelongsToCommunity/);
assert.match(roomBind, /room\.community_id !== communityId/);

// 14–15: auth absence is public discovery; API/client errors are not empty success.
assert.match(feed, /Error fetching public discovery feed/);
assert.match(feedCard, /setLoadError\(true\)/);
assert.match(feedCard, /Unable to load the community feed/);

// 16: empty public feed is distinct from error / signed-in CTA.
assert.match(feedCard, /No public posts yet/);
assert.match(feedCard, /Loading your community feed/);
assert.match(feedCard, /showSignIn/);
assert.doesNotMatch(feedCard, /Communities are not available yet/);

// 18: RBAC write helpers unchanged; public SELECT policy is read-only.
assert.match(rbac, /export async function requireCommunityMember/);
assert.match(rbac, /export async function requireCommunityModerator/);
assert.match(rbac, /export async function requireCommunityAdmin/);
assert.match(rbac, /export async function requireCommunityOwner/);
assert.match(feed, /requireCommunityMember/);
assert.match(postsRls, /community_posts_insert/);
assert.doesNotMatch(publicRls, /FOR INSERT/);
assert.doesNotMatch(publicRls, /DISABLE ROW LEVEL SECURITY/);
assert.doesNotMatch(feedGet, /getAdminDB/);
assert.doesNotMatch(feedCard, /sb_secret_|SUPABASE_SERVICE_ROLE_KEY|service_role/);

console.log("verify-community-public-feed: ok");
