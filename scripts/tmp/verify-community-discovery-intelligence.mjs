/**
 * Community discovery intelligence v2 — smoke checks (no network).
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
  "database/migrations/119_community_discovery_intelligence_v2.sql"
);
mustExist(
  "supabase/migrations/20260730031723_community_discovery_intelligence_v2.sql"
);

assert.match(migration, /user_community_pins/);
assert.match(migration, /get_trending_community_topics/);
assert.match(migration, /idx_community_posts_attachments_hashtags_gin/);
assert.match(migration, /supabase_realtime ADD TABLE public\.user_community_pins/);
assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.get_trending_community_topics/);

const affinity = mustExist("lib/discovery/community-affinity.ts");
assert.match(affinity, /getRecommendedCommunitiesForYou/);
assert.match(affinity, /communityTrendingScore/);
assert.match(affinity, /discovery_views/);
assert.match(affinity, /community_post_likes/);
assert.match(affinity, /search_history/);
assert.match(affinity, /member_points/);
assert.doesNotMatch(affinity, /Math\.random/);

const reco = mustExist("lib/discovery/recommendations.ts");
assert.match(reco, /getRecommendedCommunitiesForYou/);
assert.match(reco, /Recommended for You/);

const pinsLib = mustExist("lib/community/pins.ts");
assert.match(pinsLib, /MAX_COMMUNITY_PINS\s*=\s*20/);

const pinsRoute = mustExist("app/api/c/pins/route.ts");
assert.match(pinsRoute, /user_community_pins/);
assert.match(pinsRoute, /MAX_COMMUNITY_PINS/);
assert.match(pinsRoute, /orderedCommunityIds/);

const topicsRoute = mustExist("app/api/c/hub/topics/route.ts");
assert.match(topicsRoute, /get_trending_community_topics/);
assert.match(topicsRoute, /extractHashtags/);
assert.match(topicsRoute, /source: "fallback"/);

console.log("verify-community-discovery-intelligence: ok");
