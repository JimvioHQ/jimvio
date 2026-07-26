/**
 * Feed engagement hardening smoke checks — no network.
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

mustExist("database/migrations/114_feed_engagement_hardening.sql");
const migration = mustExist("supabase/migrations/20260726180000_feed_engagement_hardening.sql");
assert.match(migration, /community_post_reactions/);
assert.match(migration, /community_post_views/);
assert.match(migration, /community_post_shares/);
assert.match(migration, /bookmark_collections/);
assert.match(migration, /record_community_post_view/);
assert.match(migration, /reaction_counts/);
assert.match(migration, /unique_view_count/);
assert.match(migration, /community_comment_likes/);

const reactions = mustExist("lib/feed/reactions.ts");
assert.match(reactions, /POST_REACTIONS/);
assert.match(reactions, /love|fire|clap|laugh|wow|sad|angry/);

const composerUtils = mustExist("lib/feed/composer-utils.ts");
assert.match(composerUtils, /extractMentions|extractHashtags/);
assert.match(composerUtils, /compressImageFile/);
assert.match(composerUtils, /COMPOSER_MAX_CHARS/);

const ranking = mustExist("lib/growth/feed-ranking.ts");
assert.match(ranking, /rankFeedItems/);
assert.match(ranking, /feedScore/);

mustExist("app/api/posts/[postId]/react/route.ts");
mustExist("app/api/posts/[postId]/view/route.ts");
mustExist("app/api/posts/[postId]/analytics/route.ts");
mustExist("app/api/posts/[postId]/bookmark/route.ts");
mustExist("app/api/posts/bookmarks/collections/route.ts");
mustExist("app/api/posts/[postId]/comments/[commentId]/like/route.ts");

const feedRoute = mustExist("app/api/posts/feed/route.ts");
assert.match(feedRoute, /rankFeedItems/);
assert.match(feedRoute, /audience/);
assert.match(feedRoute, /poll_multiple|poll_anonymous|poll_expires_at/);

const share = mustExist("app/api/posts/[postId]/share/route.ts");
assert.match(share, /community_post_shares/);
assert.match(share, /repost|quote|copy/);

const mock = mustExist("lib/feed/mock-data.ts");
assert.match(mock, /Upload Post/);
assert.doesNotMatch(mock, /Upload Clip/);

const composer = mustExist("components/feed/PostComposer.tsx");
assert.match(composer, /audience|compressImageFile|COMPOSER_MAX_CHARS/);
assert.match(composer, /Go Live|Mission|Poll/);

const createMenu = mustExist("components/feed/CreateMenuPanel.tsx");
assert.match(createMenu, /upload/);

console.log("verify-feed-engagement-hardening: ok");
