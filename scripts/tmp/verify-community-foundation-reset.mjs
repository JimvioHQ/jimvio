/**
 * Community foundation reset — no default Groups/Channels.
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

const communitiesApi = mustExist("app/api/communities/route.ts");
const spacesApi = mustExist("app/api/c/spaces/route.ts");
const groupsApi = mustExist("app/api/c/owner/groups/route.ts");
const groupDefaults = mustExist(
  "lib/community/owner-console/groups/constants.ts"
);
const overview = mustExist(
  "components/community/hub/hub-community-overview.tsx"
);
const sidebar = mustExist("components/shell/CommunitySidebar.tsx");
const createSpace = mustExist("components/community/CreateSpaceDialog.tsx");
const createForm = mustExist(
  "components/community/creator/CreateCommunityForm.tsx"
);

assert.doesNotMatch(communitiesApi, /bootstrapDefaultSpaces/);
assert.doesNotMatch(communitiesApi, /slug: "channels"/);
assert.doesNotMatch(communitiesApi, /slug: "general"/);
assert.doesNotMatch(communitiesApi, /Voice Room/);

assert.doesNotMatch(spacesApi, /roomName/);
assert.doesNotMatch(spacesApi, /name: "General"/);
assert.match(spacesApi, /room: null/);

assert.doesNotMatch(groupsApi, /name: "General"/);
assert.match(groupDefaults, /defaultChannels: \[\]/);

assert.doesNotMatch(sidebar, /DEFAULT_CHANNEL_DEFS/);
assert.doesNotMatch(sidebar, /label: "Signals"/);
assert.doesNotMatch(sidebar, /fallbackHref/);

assert.doesNotMatch(createSpace, /defaultRoomType/);
assert.doesNotMatch(createForm, /Default channels are created/);

assert.match(overview, /Welcome to your new Community|This community is being prepared/);
assert.match(overview, /Create your first Group/);
assert.match(overview, /max-w-\[1400px\]/);
assert.match(overview, /grid-cols-12/);

console.log("Community foundation reset verification passed.");
