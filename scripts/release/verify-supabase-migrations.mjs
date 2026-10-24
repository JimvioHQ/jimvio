#!/usr/bin/env node
/**
 * Structural checks for supabase/migrations. Does not connect to a database.
 * Fails closed on duplicate versions, bad names, and empty files.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const dir = join(process.cwd(), "supabase", "migrations");
const files = readdirSync(dir).filter((file) => file.endsWith(".sql")).sort();
const versions = new Map();
let errors = 0;

if (!files.length) {
  console.error("supabase/migrations has no SQL files");
  process.exit(1);
}

for (const file of files) {
  const match = file.match(/^(\d{14})_(.+)\.sql$/);
  if (!match) {
    console.error(`Migration filename must be <14-digit version>_<name>.sql: ${file}`);
    errors += 1;
    continue;
  }
  const [, version, name] = match;
  if (!/^[a-z0-9_]+$/.test(name)) {
    console.error(`Migration name has unexpected characters: ${file}`);
    errors += 1;
  }
  if (versions.has(version)) {
    console.error(`Duplicate migration version ${version}: ${versions.get(version)} and ${file}`);
    errors += 1;
  } else {
    versions.set(version, file);
  }
  if (!readFileSync(join(dir, file), "utf8").trim()) {
    console.error(`Empty migration: ${file}`);
    errors += 1;
  }
}

if (errors) {
  console.error(`Supabase migration structure failed (${errors} error(s))`);
  process.exit(1);
}

console.log(`✅ Supabase migration structure OK (${files.length} files)`);
