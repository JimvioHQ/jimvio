/**
 * Posts ecosystem production smoke checks — no network.
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

function mustNotExist(rel) {
  const p = path.join(root, rel);
  assert.ok(!fs.existsSync(p), `dead duplicate should be removed: ${rel}`);
}

const rls = mustExist("database/migrations/102_community_posts_production_rls.sql");
assert.match(rls, /community_posts_select/);
assert.match(rls, /community_memberships/);
assert.match(rls, /community_posts_update/);
assert.match(rls, /admin.*moderator|moderator.*admin/);
assert.match(rls, /community_post_poll_votes_update/);

const sanitize = mustExist("lib/community/posts/sanitize-post-media.ts");
assert.match(sanitize, /sanitizePostImageUrls/);
assert.match(sanitize, /sanitizeChatAttachments/);

const publish = mustExist("lib/community/workspace/assert-can-publish.ts");
assert.match(publish, /assertCanPublishInRoom/);
assert.match(publish, /assertCanCommentInRoom/);
assert.match(publish, /canComment/);

const feedApi = mustExist("app/api/posts/feed/route.ts");
assert.match(feedApi, /assertCanPublishInRoom/);
assert.match(feedApi, /sanitizePostImageUrls/);
assert.match(feedApi, /next_cursor/);
assert.doesNotMatch(feedApi, /order\("like_count"/);

const postsApi = mustExist("app/api/posts/route.ts");
assert.match(postsApi, /assertCanPublishInRoom/);
assert.match(postsApi, /sanitizePostImageUrls/);
assert.match(postsApi, /user_has_liked/);

const allApi = mustExist("app/api/posts/all/[communityId]/route.ts");
assert.match(allApi, /assertCanPublishInRoom/);
assert.match(allApi, /sanitizePostImageUrls/);

const commentsApi = mustExist("app/api/posts/[postId]/comments/route.ts");
assert.match(commentsApi, /assertCanCommentInRoom/);
assert.match(commentsApi, /Invalid parent comment/);
assert.match(commentsApi, /nextCursor/);

const postMut = mustExist("app/api/posts/[postId]/route.ts");
assert.match(postMut, /sanitizePostImageUrls/);
assert.match(postMut, /isStaff/);

const pollVote = mustExist("app/api/posts/[postId]/poll/vote/route.ts");
assert.doesNotMatch(pollVote, /votes:\s*\(opt\.votes/);
assert.match(pollVote, /fail closed|Do not invent/i);

const feedPage = mustExist("app/communities/(hubs)/[slug]/feed/page.tsx");
assert.match(feedPage, /communityId=\{community\.id\}/);

const feedUi = mustExist("components/community/workspace/sections/Feed.tsx");
assert.match(feedUi, /subscribePostgresChangesMany/);
assert.match(feedUi, /next_cursor/);
assert.match(feedUi, /communityId/);
assert.match(feedUi, /toast\.(error|success)/);
assert.match(feedUi, /Bookmark/);
assert.doesNotMatch(feedUi, /setHasMore\(posts\.length === PAGE_SIZE\)/);

const postsRoom = mustExist("components/community/rooms/PostsRoom.tsx");
assert.match(postsRoom, /toast\.(error|success)/);
assert.match(postsRoom, /user_has_liked/);
assert.doesNotMatch(postsRoom, /\}, \[posts\]\);/);

mustNotExist("components/community/workspace/sections/FeedSection.tsx");

const realtime = mustExist("lib/supabase/realtime-subscribe.ts");
assert.match(realtime, /subscribePostgresChangesMany/);

console.log("verify-posts-ecosystem: ok");
