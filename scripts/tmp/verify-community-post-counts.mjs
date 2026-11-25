import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const migrationPath = path.join(
  root,
  "supabase/migrations/20261125190000_maintain_community_post_count.sql",
);
assert.ok(fs.existsSync(migrationPath), "Community post counter migration is missing");

const migration = fs.readFileSync(migrationPath, "utf8");
assert.match(migration, /create or replace function public\.sync_community_post_count/i);
assert.match(migration, /security definer/i);
assert.match(migration, /set search_path = public, pg_temp/i);
assert.match(migration, /after insert or delete or update of community_id, is_published/i);
assert.match(migration, /coalesce\(new\.is_published, false\)/i);
assert.match(migration, /coalesce\(old\.is_published, false\)/i);
assert.match(migration, /set post_count = coalesce\(post_count, 0\) \+ 1/i);
assert.match(migration, /set post_count = greatest\(0, coalesce\(post_count, 0\) - 1\)/i);
assert.match(migration, /update public\.communities c\s+set post_count = coalesce\(/i);
assert.match(migration, /where p\.is_published is true/i);
assert.doesNotMatch(migration, /\b(delete from|truncate)\b/i);

console.log("Community published post counter verification passed.");
