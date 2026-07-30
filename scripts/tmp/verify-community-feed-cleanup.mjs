/**
 * Community feed cleanup + video autoplay smoke checks — no network.
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

function communityTrendingScore(input) {
  const members = Math.max(0, Number(input.member_count ?? 0) || 0);
  const posts = Math.max(0, Number(input.post_count ?? 0) || 0);
  const recentPosts = Math.max(0, Number(input.recent_posts ?? 0) || 0);
  const recentJoins = Math.max(0, Number(input.recent_joins ?? 0) || 0);
  const online = Math.max(0, Number(input.online_members ?? 0) || 0);
  const featured = Boolean(input.is_featured);
  return (
    Math.log1p(members) * 3 +
    Math.log1p(posts) * 2 +
    Math.log1p(recentPosts) * 4 +
    Math.log1p(recentJoins) * 3.5 +
    Math.log1p(online) * 2.5 +
    (featured ? 8 : 0)
  );
}

const dbMig = mustExist("database/migrations/118_community_trending_score.sql");
assert.match(dbMig, /community_trending_score/);
assert.match(dbMig, /get_trending_communities/);
assert.match(dbMig, /member_points/);
assert.match(dbMig, /SECURITY DEFINER/);

const sbMig = mustExist(
  "supabase/migrations/20260730023626_community_trending_score.sql"
);
assert.match(sbMig, /get_trending_communities/);
assert.match(sbMig, /community_trending_score/);

const scoreLib = mustExist("lib/community/trending-score.ts");
assert.match(scoreLib, /communityTrendingScore/);
assert.match(scoreLib, /isCommunityVerified/);
assert.match(scoreLib, /Math\.log1p\(members\) \* 3/);

const engine = mustExist("lib/community/feed-video-engine.ts");
assert.match(engine, /CommunityFeedVideoEngine/);
assert.match(engine, /visibilityRatio/);
assert.match(engine, /setActive/);

const rail = mustExist("components/feed/FeedDiscoverRail.tsx");
assert.match(rail, /Trending Communities/);
assert.match(rail, /tagline|Community on Jimvio/);
assert.match(rail, /BadgeCheck|verified/);
assert.doesNotMatch(rail, /Recommended for You/);
assert.doesNotMatch(rail, />\s*Join\s*</);
assert.doesNotMatch(rail, /memberCount|Users className/);
assert.doesNotMatch(rail, /absolute left-1\.5 top-1\.5 rounded-md bg-black\/60.*category/s);
assert.doesNotMatch(rail, /Trending creators/);
assert.doesNotMatch(rail, /Trending products/i);
assert.doesNotMatch(rail, /Campaign announcements/i);

const discoverApi = mustExist("app/api/c/hub/discover/route.ts");
assert.match(discoverApi, /tagline/);
assert.match(discoverApi, /get_trending_communities/);
assert.match(discoverApi, /communities:/);
assert.doesNotMatch(discoverApi, /ugc_campaigns/);
assert.doesNotMatch(discoverApi, /from\("products"\)/);
assert.doesNotMatch(discoverApi, /from\("profiles"\)/);

const player = mustExist("components/community/CommunityVideoPlayer.tsx");
assert.match(player, /IntersectionObserver/);
assert.match(player, /CommunityFeedVideoEngine/);
assert.match(player, /muted/);
assert.match(player, /Tap for sound|Play video/);

const feedPage = mustExist("components/feed/FeedPageContent.tsx");
assert.match(feedPage, /trending communities/i);
assert.doesNotMatch(feedPage, /trending creators/i);

const hot = communityTrendingScore({
  member_count: 500,
  post_count: 120,
  is_featured: true,
  recent_posts: 40,
  recent_joins: 20,
  online_members: 12,
});
const cold = communityTrendingScore({
  member_count: 2,
  post_count: 0,
  is_featured: false,
});
assert.ok(hot > cold, "hot community should outrank cold");

console.log("verify-community-feed-cleanup: ok");
