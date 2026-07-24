/**
 * Flat channel routing — canonical /channels/[channelSlug] + legacy redirect.
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
const channelPage = mustExist(
  "app/communities/(hubs)/[slug]/channels/[channelSlug]/page.tsx"
);
const legacyPage = mustExist(
  "app/communities/(hubs)/[slug]/groups/[groupSlug]/channels/[channelSlug]/page.tsx"
);
const channelWsPage = mustExist(
  "components/community/workspace/channel/ChannelWorkspacePage.tsx"
);
const sidebar = mustExist("components/shell/CommunitySidebar.tsx");
const search = mustExist("services/community/search.ts");

assert.match(nav, /\/channels\/\$\{encodeURIComponent\(channelSlug\)\}/);
assert.doesNotMatch(
  nav.split("legacyNestedChannelHref")[0],
  /\/groups\/\$\{encodeURIComponent\(groupSlug\)\}\/channels\//
);
assert.match(hubAuth, /"channels"/);
assert.match(channelPage, /ChannelWorkspacePage/);
assert.match(legacyPage, /permanentRedirect/);
assert.match(channelWsPage, /resolveSpaceAndRoom/);
assert.match(sidebar, /\/channels\/\$\{channel\.channelSlug\}/);
assert.match(search, /\/channels\/\$\{room\.slug\}/);
assert.doesNotMatch(search, /\/groups\/\$\{space\.slug\}\/channels\//);

console.log("Flat channel routing verification passed.");
