/**
 * Community posts & stories production smoke checks — no network.
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

const dbMig = mustExist("database/migrations/115_community_posts_stories.sql");
assert.match(dbMig, /CREATE TABLE IF NOT EXISTS public\.community_stories/);
assert.match(dbMig, /community_story_views/);
assert.match(dbMig, /community_story_replies/);
assert.match(dbMig, /community_story_analytics/);
assert.match(dbMig, /record_community_story_view/);
assert.match(dbMig, /expires_at/);
assert.match(dbMig, /48 hours/);

const sbMig = mustExist("supabase/migrations/20260726190000_community_posts_stories.sql");
assert.match(sbMig, /community_stories/);
assert.match(sbMig, /record_community_story_view/);

const storiesApi = mustExist("app/api/stories/route.ts");
assert.match(storiesApi, /export async function GET/);
assert.match(storiesApi, /export async function POST/);
assert.match(storiesApi, /expires_at/);
assert.match(storiesApi, /media_type/);
assert.match(storiesApi, /community_stories/);
assert.match(storiesApi, /groups/);

const storyApi = mustExist("app/api/stories/[storyId]/route.ts");
assert.match(storyApi, /export async function GET/);
assert.match(storyApi, /export async function DELETE/);
assert.match(storyApi, /author_id/);

const viewApi = mustExist("app/api/stories/[storyId]/view/route.ts");
assert.match(viewApi, /record_community_story_view/);
assert.match(viewApi, /watch_ms/);
assert.match(viewApi, /completion_pct/);

const repliesApi = mustExist("app/api/stories/[storyId]/replies/route.ts");
assert.match(repliesApi, /export async function GET/);
assert.match(repliesApi, /export async function POST/);
assert.match(repliesApi, /community_story_replies/);

const analyticsApi = mustExist("app/api/stories/[storyId]/analytics/route.ts");
assert.match(analyticsApi, /community_story_analytics/);
assert.match(analyticsApi, /Forbidden/);

const rail = mustExist("components/feed/StoriesRail.tsx");
assert.match(rail, /\/api\/stories/);
assert.match(rail, /uploadCommunityChatFile/);
assert.match(rail, /StoryViewer/);
assert.match(rail, /community_stories/);
assert.match(rail, /subscribePostgresChanges/);
assert.doesNotMatch(rail, /from "@\/lib\/feed\/mock-data"/);

const viewer = mustExist("components/feed/StoryViewer.tsx");
assert.match(viewer, /\/api\/stories\/\$\{.*\}\/view/);
assert.match(viewer, /\/api\/stories\/\$\{.*\}\/replies/);
assert.match(viewer, /progress/);

const hub = mustExist("services/community/hub-data.ts");
assert.match(hub, /getHubStories/);
assert.match(hub, /community_stories/);

const overview = mustExist("components/community/hub/hub-community-overview.tsx");
assert.match(overview, /"posts"/);
assert.match(overview, /OverviewPostsPanel/);
assert.doesNotMatch(overview, /id:\s*"events"\s+as\s+const/);

const postsPanel = mustExist("components/community/hub/overview-section-panels.tsx");
assert.match(postsPanel, /export function OverviewPostsPanel/);
assert.match(postsPanel, /FeedSection/);
assert.match(postsPanel, /\/create\/post\?community=/);

const createPost = mustExist("app/create/post/page.tsx");
assert.match(createPost, /PostComposer/);
assert.match(createPost, /variant="page"/);

const channelTabs = mustExist("lib/community/workspace/types.ts");
assert.match(channelTabs, /CHANNEL_TAB_IDS/);
assert.match(channelTabs, /"posts"/);
assert.doesNotMatch(channelTabs, /CHANNEL_TAB_IDS[\s\S]*?"events"/);

const feed = mustExist("components/community/workspace/sections/Feed.tsx");
assert.match(feed, /\/communities\/\$\{communitySlug\}/);
assert.match(feed, /comments_disabled/);
assert.match(feed, /archived_at/);

console.log("verify-community-posts-stories: ok");
