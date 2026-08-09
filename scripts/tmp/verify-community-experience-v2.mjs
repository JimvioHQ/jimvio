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

console.log("verify-community-experience-v2: ok");
