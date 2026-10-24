#!/usr/bin/env node
/**
 * Fail closed unless every supabase/migrations version is on the linked
 * production history and every remote version has a local file.
 * This check never runs migration SQL.
 */
import { readdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const token = (process.env.SUPABASE_ACCESS_TOKEN || "").trim();
const ref = (process.env.SUPABASE_PROJECT_REF || "").trim();

if (!token || !ref) {
  console.error("Missing SUPABASE_ACCESS_TOKEN or SUPABASE_PROJECT_REF");
  process.exit(1);
}
if (!/^[a-z0-9]{20}$/.test(ref)) {
  console.error("SUPABASE_PROJECT_REF is not a 20-character project ref");
  process.exit(1);
}

function fromFile(file) {
  const match = file.match(/^(\d{14})_(.+)\.sql$/);
  return match ? { version: match[1], name: match[2] } : null;
}

const localFiles = readdirSync(join(root, "supabase", "migrations"))
  .filter((file) => file.endsWith(".sql"))
  .map(fromFile)
  .filter(Boolean);

const localByVersion = new Map();
for (const file of localFiles) {
  if (localByVersion.has(file.version)) {
    console.error(`Duplicate local version ${file.version}`);
    process.exit(1);
  }
  localByVersion.set(file.version, file.name);
}

const response = await fetch(
  `https://api.supabase.com/v1/projects/${ref}/database/migrations`,
  { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } }
);

if (!response.ok) {
  console.error(`Management API migrations failed: HTTP ${response.status}`);
  process.exit(1);
}

const remote = await response.json();
const remoteRows = (Array.isArray(remote) ? remote : remote.migrations || []).map((row) => ({
  version: String(row.version || ""),
  name: String(row.name || ""),
}));

const remoteByVersion = new Map();
for (const row of remoteRows) {
  if (!row.version) continue;
  if (remoteByVersion.has(row.version)) {
    console.error(`Duplicate remote version ${row.version}`);
    process.exit(1);
  }
  remoteByVersion.set(row.version, row.name);
}

const localOnly = [...localByVersion.keys()].filter((version) => !remoteByVersion.has(version)).sort();
const remoteOnly = [...remoteByVersion.keys()].filter((version) => !localByVersion.has(version)).sort();
const nameMismatches = [...localByVersion.keys()].filter((version) => {
  const remoteName = remoteByVersion.get(version);
  return remoteName && remoteName !== localByVersion.get(version);
});

console.log(`Local migrations: ${localByVersion.size}`);
console.log(`Remote migrations: ${remoteByVersion.size}`);
console.log(`Matched versions: ${localByVersion.size - localOnly.length}`);

if (localOnly.length || remoteOnly.length || nameMismatches.length) {
  console.error("Migration history does not match supabase/migrations.");
  for (const version of localOnly) console.error(` - local only: ${version}_${localByVersion.get(version)}`);
  for (const version of remoteOnly) console.error(` - remote only: ${version}_${remoteByVersion.get(version)}`);
  for (const version of nameMismatches) {
    console.error(
      ` - name mismatch ${version}: local ${localByVersion.get(version)} remote ${remoteByVersion.get(version)}`
    );
  }
  console.error("Refusing to continue. Do not repair or push until the schema for each version is proven.");
  process.exit(1);
}

console.log("✅ Local and remote migration versions match. No schema changes were applied.");
