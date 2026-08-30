/**
 * World-scale Jimvio community ecosystem — static contract checks.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const require = createRequire(import.meta.url);

function read(rel) {
  const p = path.join(root, rel);
  assert.ok(fs.existsSync(p), `missing ${rel}`);
  return fs.readFileSync(p, "utf8");
}

const blueprints = read("lib/community/editorial-world-blueprints.ts");
assert.match(blueprints, /WORLD_COMMUNITY_SEEDS/);
assert.match(blueprints, /MEMBER_TIER_RANGES/);
assert.match(blueprints, /assertWorldBlueprintIntegrity/);
assert.match(blueprints, /FORBIDDEN_SLUGS/);
assert.doesNotMatch(blueprints, /slug: "forex-hub"|slug: "gcs-unity"/);
assert.doesNotMatch(blueprints, /Bot Community|Seed Hub|Demo Group|fake user/i);

const worldSeed = read("scripts/seed-community-world.ts");
assert.match(worldSeed, /EDITORIAL_CATALOG/);
assert.match(worldSeed, /targetMemberCount|targetMembers/);
assert.match(worldSeed, /2000/);
assert.match(worldSeed, /forex-hub/);
assert.match(worldSeed, /gcs-unity/);
assert.match(worldSeed, /images:/);
assert.match(worldSeed, /video_url:/);
assert.match(worldSeed, /view_count:/);
assert.match(worldSeed, /like_count:/);
assert.match(worldSeed, /auth\.admin\.createUser/);
assert.match(worldSeed, /ALL_EDITORIAL_PERSONAS/);
assert.doesNotMatch(worldSeed, /DISABLE ROW LEVEL SECURITY/);

const api = read("app/api/communities/route.ts");
assert.match(api, /forex-hub/);
assert.match(api, /gcs-unity/);

const origin = read("lib/community/editorial-origin.ts");
assert.match(origin, /targetMemberCount/);
assert.match(origin, /From Jimvio/);

const migrations = fs
  .readdirSync(path.join(root, "supabase", "migrations"))
  .filter((name) => /editorial|seeded-community|community-world|community-experiences/i.test(name));
assert.equal(migrations.length, 0, "no editorial community migration should exist");

// Dynamic catalog size check via tsx-compiled path is heavy; count blueprints statically.
const slugMatches = blueprints.match(/slug:\s*"[a-z0-9-]+"/g) || [];
assert.ok(slugMatches.length >= 200, `expected >=200 world slugs, got ${slugMatches.length}`);

console.log("verify-community-world-ecosystem: ok");
