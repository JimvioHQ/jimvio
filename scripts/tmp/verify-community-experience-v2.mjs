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
assert.match(home, /Highlights/);
assert.match(home, /Community Activity/);
assert.match(home, /Member Spotlight/);
assert.match(home, /Featured Spaces/);
assert.match(home, /recentActivity/);
assert.match(home, /founder|moderators|memberAvatars/);
assert.match(home, /communitySpaceHref/);
assert.doesNotMatch(home, /Global creator & affiliate network/);

console.log("verify-community-experience-v2: ok");
