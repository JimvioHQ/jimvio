/**
 * Flat Space routing — canonical /spaces/[spaceSlug] + legacy redirects.
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

const nav = mustExist("lib/community/workspace/navigation.ts");
const hubAuth = mustExist("lib/community/hub-auth.ts");
const spacePage = mustExist(
  "app/communities/(hubs)/[slug]/spaces/[spaceSlug]/page.tsx"
);
const channelPage = mustExist(
  "app/communities/(hubs)/[slug]/channels/[channelSlug]/page.tsx"
);
const legacyPage = mustExist(
  "app/communities/(hubs)/[slug]/groups/[groupSlug]/channels/[channelSlug]/page.tsx"
);
const groupsPage = mustExist(
  "app/communities/(hubs)/[slug]/groups/[groupSlug]/page.tsx"
);
const sidebar = mustExist("components/shell/CommunitySidebar.tsx");
const search = mustExist("services/community/search.ts");

assert.match(nav, /communitySpaceHref/);
assert.match(nav, /\/spaces\/\$\{encodeURIComponent\(spaceSlug\)\}/);
assert.doesNotMatch(
  nav.split("legacyNestedChannelHref")[0],
  /\/groups\/\$\{encodeURIComponent\(groupSlug\)\}\/channels\//
);
assert.match(hubAuth, /"spaces"/);
assert.match(spacePage, /SpaceWorkspacePage|GroupWorkspacePage/);
assert.match(channelPage, /permanentRedirect/);
assert.match(groupsPage, /permanentRedirect/);
assert.match(legacyPage, /permanentRedirect/);
assert.match(sidebar, /communitySpaceHref|communityChannelHref/);
assert.match(sidebar, /\/spaces\/|Discover/);
assert.match(search, /\/spaces\/|\/channels\//);
assert.doesNotMatch(search, /\/groups\/\$\{space\.slug\}\/channels\//);

console.log("Flat channel routing verification passed.");
