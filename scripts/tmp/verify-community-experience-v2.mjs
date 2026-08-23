/**
 * Community Experience V2 smoke checks — no network.
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

const hub = mustExist("components/community/hub/hub-community-overview.tsx");
assert.match(hub, /CommunityOverviewHome/);
assert.match(hub, /Joined|Join Community/);

const home = mustExist("components/community/hub/community-overview-home.tsx");
assert.match(home, /Description/);
assert.match(home, /Mission/);
assert.match(home, /Vision/);
assert.match(home, /Announcements/);
assert.doesNotMatch(home, /Community Activity/);
assert.doesNotMatch(home, /Member Spotlight/);
assert.doesNotMatch(home, /Featured Spaces/);
assert.doesNotMatch(home, />\s*Highlights\s*</);
assert.doesNotMatch(home, /Global creator & affiliate network/);
assert.doesNotMatch(home, /A place for people who care about/);
assert.doesNotMatch(home, /Become the go-to home for/);

const feedUi = mustExist("components/community/workspace/sections/Feed.tsx");
assert.match(feedUi, /\/create\/post/);
assert.match(feedUi, /What.?s on your mind/);
assert.doesNotMatch(feedUi, /id=\{isHub \? "hub-community-composer"/);

const header = mustExist("components/community/workspace/group/GroupHeader.tsx");
assert.doesNotMatch(header, /Created \{/);
assert.match(header, /sm:flex-nowrap/);

const rls = mustExist("supabase/migrations/20260821120000_public_community_read_rls.sql");
assert.match(rls, /community_posts_select_public/);
assert.match(rls, /community_messages_select_public/);
assert.match(rls, /FOR SELECT/);
assert.doesNotMatch(rls, /FOR INSERT/);
assert.doesNotMatch(rls, /FOR UPDATE/);
assert.doesNotMatch(rls, /FOR DELETE/);
assert.doesNotMatch(rls, /DISABLE ROW LEVEL SECURITY/);

const hubAuth = mustExist("lib/community/hub-auth.ts");
assert.match(hubAuth, /"feed"/);
assert.match(hubAuth, /"spaces"/);

console.log("verify-community-experience-v2: ok");
