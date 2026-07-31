/**
 * Discovery / search engine smoke checks — no network.
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

mustExist("database/migrations/113_discovery_search_engine.sql");
mustExist("supabase/migrations/20260726170000_discovery_search_engine.sql");

const migration = mustExist("supabase/migrations/20260726170000_discovery_search_engine.sql");
assert.match(migration, /discovery_views/);
assert.match(migration, /search_history/);
assert.match(migration, /idx_communities_name_trgm/);
assert.match(migration, /idx_products_search_fts/);
assert.match(migration, /gin_trgm_ops/);

const search = mustExist("lib/discovery/search.ts");
assert.match(search, /globalSearch/);
assert.match(search, /searchProducts|searchCommunities|searchCreators/);
assert.match(search, /searchCourses|searchLive|searchCampaigns/);
assert.match(search, /searchSpaces|searchPosts|searchMessages/);
assert.match(search, /communitySpaceHref/);
assert.doesNotMatch(search, /\/communities\/spaces\/\$\{/);
assert.match(search, /encodeCursor|decodeCursor/);

const ranking = mustExist("lib/discovery/ranking.ts");
assert.match(ranking, /textRelevanceScore/);
assert.match(ranking, /engagementBoost/);
assert.match(ranking, /combineScore/);

const reco = mustExist("lib/discovery/recommendations.ts");
assert.match(reco, /getRecommendations/);
assert.match(reco, /getRecentlyViewed/);
assert.match(reco, /getFollowingRecommendations/);

const shelves = mustExist("lib/discovery/shelves.ts");
assert.match(shelves, /trending/);
assert.match(shelves, /featured/);
assert.match(shelves, /recently_viewed/);
assert.match(shelves, /following/);
assert.match(shelves, /nearby/);

const sanitize = mustExist("lib/discovery/sanitize.ts");
assert.match(sanitize, /typoTolerantTerms/);

mustExist("app/api/discover/search/route.ts");
mustExist("app/api/discover/recommendations/route.ts");
mustExist("app/api/discover/shelves/route.ts");
mustExist("app/api/discover/views/route.ts");

const suggestions = mustExist("app/api/search/suggestions/route.ts");
assert.match(suggestions, /globalSearch/);

const providers = mustExist("lib/command-center/providers/index.ts");
assert.match(providers, /\/api\/discover\/search/);
assert.match(providers, /fetchDiscover/);

console.log("verify-discovery-search-engine: ok");
