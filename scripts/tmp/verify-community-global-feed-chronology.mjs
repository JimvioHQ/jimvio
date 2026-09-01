/**
 * Global Community Feed must be chronological, not pinned-first.
 * Auto-picked up by npm test via scripts/tmp/verify-*.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const publicFeed = read("lib/feed/load-public-discovery-feed.ts");
const feedRoute = read("app/api/posts/feed/route.ts");
const ranking = read("lib/growth/feed-ranking.ts");
const worldBuild = read("lib/community/editorial-world-build.ts");
const seed = read("scripts/seed-community-world.ts");

assert.match(publicFeed, /Global discovery is chronological/);
assert.match(publicFeed, /order\("created_at", \{ ascending: false \}/);
assert.match(publicFeed, /limit = 2000/);
assert.match(publicFeed, /\.range\(from, to\)/);

assert.match(feedRoute, /Global feed: chronological only/);
assert.match(feedRoute, /if \(communityId\)/);
assert.match(feedRoute, /order\("created_at", \{ ascending: false \}/);

assert.doesNotMatch(ranking, /is_pinned \? 10_000/);
assert.match(ranking, /is_pinned \? 0\.35/);

assert.match(worldBuild, /accessModeFor/);
assert.match(worldBuild, /commentBodiesFor/);
assert.match(worldBuild, /density >= 14/);

assert.match(seed, /access === "private"/);
assert.match(seed, /access === "paid"/);
assert.match(seed, /PRESERVED/);
assert.match(seed, /forex-hub/);
assert.match(seed, /gcs-unity/);

console.log("verify-community-global-feed-chronology: ok");
