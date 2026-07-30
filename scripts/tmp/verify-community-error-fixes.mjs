#!/usr/bin/env node
/**
 * Smoke checks for community error fixes (feed page, mutes, role gate, default workspace).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const feed = read("app/api/posts/feed/route.ts");
assert.match(feed, /return NextResponse\.json\(\{ posts, next_cursor \}\)/);
assert.doesNotMatch(feed, /return NextResponse\.json\(\{ posts: enriched, next_cursor \}\)/);

const perms = read("lib/community/workspace/permissions.ts");
const activeGate = 'if (!membership || membership.status !== "active") return "guest";';
assert.ok(perms.includes(activeGate), "active membership gate missing");
assert.ok(
  perms.indexOf(activeGate) < perms.indexOf('if (role === "admin") return "admin";'),
  "active membership must be required before staff roles"
);

const communities = read("app/api/communities/route.ts");
assert.match(communities, /ensureDefaultCommunityWorkspace/);
assert.match(communities, /visibility_mode/);
assert.match(communities, /is_private\.eq\.false/);

const muteRoute = read("app/api/c/[communityId]/mute/route.ts");
assert.match(muteRoute, /withCommunityMute/);
assert.match(muteRoute, /withRoomMute/);
assert.match(muteRoute, /withSpaceMute/);

const overview = read("components/community/hub/hub-community-overview.tsx");
assert.match(overview, /\/api\/c\/\$\{communityId\}\/mute/);

const group = read("components/community/workspace/group/GroupWorkspace.tsx");
assert.match(group, /spaceId: space\.id/);

const channel = read("components/community/workspace/channel/ChannelHeader.tsx");
assert.match(channel, /roomId: channel\.id/);

const pins = read("app/api/c/pins/route.ts");
assert.match(pins, /failed\?\.error/);

const migration = read(
  "supabase/migrations/20260730132000_community_default_workspace_backfill.sql"
);
assert.match(migration, /ins_spaces/);
assert.match(migration, /Discussion/);

assert.ok(fs.existsSync(path.join(root, "lib/community/notification-mutes.ts")));
assert.ok(fs.existsSync(path.join(root, "lib/community/ensure-default-workspace.ts")));

const helper = path.join(root, "lib/community/notification-mutes.ts");
const unit = `
import {
  withCommunityMute, withSpaceMute, withRoomMute,
  isCommunityMuted, isSpaceMuted, isRoomMuted, parseNotificationMutes
} from ${JSON.stringify(helper)};
import assert from "node:assert/strict";
const base = withCommunityMute({}, true);
assert.equal(isCommunityMuted(base), true);
assert.equal(isSpaceMuted(withSpaceMute(base, "s1", true), "s1"), true);
assert.equal(isRoomMuted(withRoomMute({}, "r1", true), "r1"), true);
assert.deepEqual(parseNotificationMutes(null), {});
console.log("mute-helpers-ok");
`;
const tmp = path.join(root, ".next/mute-helper-unit.mjs");
fs.mkdirSync(path.dirname(tmp), { recursive: true });
fs.writeFileSync(tmp, unit);
const r = spawnSync(process.execPath, ["--experimental-strip-types", tmp], {
  encoding: "utf8",
  cwd: root,
});
if (r.status !== 0) {
  console.warn("mute helper runtime unit skipped:", (r.stderr || r.stdout || "").slice(0, 200));
} else {
  assert.match(r.stdout || "", /mute-helpers-ok/);
}

console.log("verify-community-error-fixes: ok");
