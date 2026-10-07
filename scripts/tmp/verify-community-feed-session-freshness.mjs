/**
 * Community global feed must mint a fresh session seed per load and
 * support one-shot session boost after post create (not a DB pin).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const exclusions = read("lib/feed/global-feed-exclusions.ts");
const feed = read("components/community/workspace/sections/Feed.tsx");
const composer = read("components/feed/PostComposer.tsx");
const boost = read("lib/feed/session-boost-post.ts");
const route = read("app/api/posts/feed/route.ts");

assert.match(exclusions, /Pagination locks the seed|session seed|getGlobalFeedRotationBucket/);
assert.match(read("lib/feed/global-feed-ranking.ts"), /candidatePoolSize/);
assert.match(exclusions, /return now/);
assert.match(boost, /stashSessionBoostPost/);
assert.match(boost, /consumeSessionBoostPost/);
assert.match(boost, /prependUniqueById/);
assert.match(boost, /sessionStorage\.removeItem/);
assert.match(composer, /stashSessionBoostPost/);
assert.match(feed, /consumeSessionBoostPost/);
assert.match(feed, /prependUniqueById/);
assert.match(feed, /pageshow/);
assert.match(route, /Cache-Control/);
assert.match(route, /no-store/);
assert.match(route, /loadGlobalCommunityFeed/);

console.log("verify-community-feed-session-freshness: ok");
