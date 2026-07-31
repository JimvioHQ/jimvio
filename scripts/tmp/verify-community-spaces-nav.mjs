/**
 * Community overview Spaces navigation smoke checks — no network.
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

const spacesIndex = mustExist(
  "app/communities/(hubs)/[slug]/spaces/page.tsx"
);
assert.match(spacesIndex, /CommunitySpacesGallery/);
assert.match(spacesIndex, /\/communities\/\$\{slug\}\/spaces/);

const gallery = mustExist(
  "components/community/workspace/sections/CommunitySpacesGallery.tsx"
);
assert.match(gallery, /SpacesSection/);
assert.match(gallery, /spacesWithRooms/);
assert.match(gallery, /communityId/);
assert.match(gallery, /slug/);

const sidebar = mustExist("components/shell/CommunitySidebar.tsx");
assert.match(sidebar, /\$\{base\}\/spaces/);
assert.match(sidebar, /No spaces available yet\.|Create First Space/);

const overview = mustExist("components/community/hub/hub-community-overview.tsx");
assert.match(overview, /href: `\$\{base\}\/spaces`/);
assert.match(overview, /Description/);
assert.match(overview, /Mission/);
assert.match(overview, /Vision/);

const spacesSection = mustExist(
  "components/community/workspace/sections/SpacesSection.tsx"
);
assert.match(spacesSection, /No spaces available yet\./);
assert.match(spacesSection, /Create First Space/);
assert.match(spacesSection, /communitySpaceHref/);

const spaceDetail = mustExist(
  "app/communities/(hubs)/[slug]/spaces/[spaceSlug]/page.tsx"
);
assert.match(spaceDetail, /SpaceWorkspacePage/);

console.log("verify-community-spaces-nav: ok");
