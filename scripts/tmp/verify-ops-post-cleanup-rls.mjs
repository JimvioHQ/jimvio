/**
 * Ops post-cleanup backup must stay service-role only.
 * Auto-picked up by npm test via scripts/tmp/verify-*.mjs
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

const migrationsDir = path.join(root, "supabase/migrations");
const migrationFile = fs
  .readdirSync(migrationsDir)
  .find((name) => name.endsWith("_lock_ops_post_cleanup_rls.sql"));
assert.ok(migrationFile, "missing lock_ops_post_cleanup_rls migration");
const migration = fs.readFileSync(path.join(migrationsDir, migrationFile), "utf8");

assert.match(
  migration,
  /ALTER TABLE public\.jimvio_ops_post_cleanup_20261005 ENABLE ROW LEVEL SECURITY/
);
assert.match(
  migration,
  /ALTER TABLE public\.jimvio_ops_post_cleanup_20261005 FORCE ROW LEVEL SECURITY/
);
assert.match(
  migration,
  /REVOKE ALL ON TABLE public\.jimvio_ops_post_cleanup_20261005 FROM anon/
);
assert.match(
  migration,
  /REVOKE ALL ON TABLE public\.jimvio_ops_post_cleanup_20261005 FROM authenticated/
);
assert.match(
  migration,
  /GRANT ALL ON TABLE public\.jimvio_ops_post_cleanup_20261005 TO service_role/
);
assert.doesNotMatch(migration, /USING\s*\(\s*true\s*\)/i);
assert.doesNotMatch(migration, /WITH CHECK\s*\(\s*true\s*\)/i);
assert.doesNotMatch(migration, /CREATE POLICY/i);

const script = mustExist("scripts/ops/curate-community-feed-cleanup.mjs");
assert.match(script, /SUPABASE_SERVICE_ROLE_KEY/);
assert.match(script, /ENABLE ROW LEVEL SECURITY/);
assert.match(script, /REVOKE ALL ON TABLE public\.jimvio_ops_post_cleanup_20261005 FROM anon/);
assert.doesNotMatch(script, /NEXT_PUBLIC_.*SERVICE_ROLE/);

const serviceRole = mustExist("lib/supabase/service-role.ts");
assert.match(serviceRole, /typeof window !== "undefined"/);
assert.match(serviceRole, /createServiceRoleClient is server-only/);
assert.doesNotMatch(serviceRole, /NEXT_PUBLIC_.*SERVICE_ROLE/);

function walk(dir, hits) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, hits);
      continue;
    }
    if (!/\.(tsx|jsx)$/.test(entry.name)) continue;
    const source = fs.readFileSync(full, "utf8");
    if (/SERVICE_ROLE|SUPABASE_SECRET_KEY|jimvio_ops_post_cleanup_20261005/.test(source)) {
      hits.push(path.relative(root, full));
    }
  }
}

const clientHits = [];
for (const dir of ["app", "components", "hooks"]) {
  const full = path.join(root, dir);
  if (fs.existsSync(full)) walk(full, clientHits);
}
assert.deepEqual(clientHits, []);

console.log("ops post-cleanup RLS contract ok");
