/**
 * Legacy Groups/Channels purge — foundation empty state + migration present.
 * Product UI uses Spaces terminology.
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

const migration = mustExist(
  "database/migrations/101_purge_legacy_groups_channels.sql"
);
const foundation = mustExist(
  "scripts/tmp/verify-community-foundation-reset.mjs"
);
const overview = mustExist(
  "components/community/hub/hub-community-overview.tsx"
);
const communitiesApi = mustExist("app/api/communities/route.ts");
const spacesApi = mustExist("app/api/c/spaces/route.ts");
const groupDefaults = mustExist(
  "lib/community/owner-console/groups/constants.ts"
);

assert.match(migration, /legacy_spaces/);
assert.match(migration, /legacy_rooms/);
assert.match(migration, /Start Here/);
assert.match(migration, /Signal Pro/);
assert.match(migration, /community_courses/);
assert.match(migration, /is_active = false/);
assert.match(migration, /space_count/);
assert.doesNotMatch(migration, /DELETE FROM public\.communities/i);
assert.doesNotMatch(migration, /DELETE FROM public\.community_memberships/i);
assert.doesNotMatch(migration, /DELETE FROM public\.community_courses/i);

assert.match(groupDefaults, /defaultChannels: \[\]/);
assert.match(overview, /Welcome to your new Community|This community is being prepared/);
assert.match(overview, /Create your first Space/);
assert.match(overview, /This community is being prepared/);
assert.doesNotMatch(communitiesApi, /bootstrapDefaultSpaces/);
assert.match(spacesApi, /spaceType|space_type/);
assert.match(spacesApi, /SPACE_TYPE_TO_ROOM_TYPE|channel_kind/);
assert.match(foundation, /Community foundation reset/);

console.log("Legacy groups/channels purge verification passed.");
