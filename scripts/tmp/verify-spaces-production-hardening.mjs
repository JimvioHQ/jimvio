/**
 * Spaces production hardening smoke checks — no network.
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

const spaceTypes = mustExist("lib/community/workspace/space-types.ts");
assert.match(spaceTypes, /"discussion"/);
assert.match(spaceTypes, /"announcement"/);
assert.match(spaceTypes, /"resources"/);
assert.match(spaceTypes, /"qa"/);
assert.match(spaceTypes, /"event"/);
assert.match(spaceTypes, /"voice"/);
assert.match(spaceTypes, /STAFF_POSTING_SPACE_TYPES/);
assert.match(spaceTypes, /channelKindForSpaceType/);

const assertPublish = mustExist("lib/community/workspace/assert-can-publish.ts");
assert.match(assertPublish, /archived/);
assert.match(assertPublish, /is_locked/);

mustExist("app/api/c/spaces/route.ts");
mustExist("app/api/c/spaces/[id]/route.ts");
mustExist("lib/community/workspace/use-spaces-realtime.ts");
mustExist("supabase/migrations/20260726083821_spaces_production_hardening.sql");
mustExist("database/migrations/107_spaces_production_hardening.sql");

const spacesRoute = mustExist("app/api/c/spaces/route.ts");
assert.match(spacesRoute, /rateLimit/);
assert.match(spacesRoute, /space\.create|group\.create/);
assert.match(spacesRoute, /STAFF_POSTING_SPACE_TYPES/);

const spaceIdRoute = mustExist("app/api/c/spaces/[id]/route.ts");
assert.match(spaceIdRoute, /archive/);
assert.match(spaceIdRoute, /restore/);
assert.match(spaceIdRoute, /lock/);

const migration = mustExist(
  "supabase/migrations/20260726083821_spaces_production_hardening.sql"
);
assert.match(migration, /supabase_realtime/);
assert.match(migration, /archived_by/);

console.log("verify-spaces-production-hardening: ok");
