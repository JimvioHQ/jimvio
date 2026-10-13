import assert from "node:assert/strict";
import {
  FEED_EDITORIAL_POSTS,
  auditFeedEditorialCollection,
  feedEditorialKey,
  normalizeCaption,
} from "../lib/community/feed-editorial/collection";
import { hashtagFeedHref, normalizeHashtagQuery } from "../lib/feed/hashtag-query";
import { extractHashtags } from "../lib/feed/composer-utils";

const issues = auditFeedEditorialCollection();
assert.equal(issues.length, 0, JSON.stringify(issues.slice(0, 8)));
assert.ok(FEED_EDITORIAL_POSTS.length >= 60 && FEED_EDITORIAL_POSTS.length <= 100);

const norms = FEED_EDITORIAL_POSTS.map((p) => normalizeCaption(p.body));
assert.equal(new Set(norms).size, norms.length);

for (const post of FEED_EDITORIAL_POSTS) {
  assert.equal(feedEditorialKey(post.id).startsWith("feed-editorial:v1:"), true);
  const tags = extractHashtags(post.body);
  assert.deepEqual(tags, post.hashtags.map((t) => t.toLowerCase()));
}

assert.equal(normalizeHashtagQuery("#Entrepreneurship"), "entrepreneurship");
assert.equal(normalizeHashtagQuery("x"), null);
assert.equal(hashtagFeedHref("Leadership"), "/communities?tag=leadership");

console.log(`verify-feed-editorial ok (${FEED_EDITORIAL_POSTS.length} posts)`);
