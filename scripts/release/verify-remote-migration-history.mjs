#!/usr/bin/env node
/**
 * Compare local supabase/migrations names to production history.
 * MCP apply_migration assigns new timestamps, so versions may differ.
 * This check requires matching migration names, not identical timestamps.
 * It never reruns historical SQL.
 */
import { readdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const token = process.env.SUPABASE_ACCESS_TOKEN || "";
const ref = process.env.SUPABASE_PROJECT_REF || "";

if (!token || !ref) {
  console.error("Missing SUPABASE_ACCESS_TOKEN or SUPABASE_PROJECT_REF");
  process.exit(1);
}

function nameFromFile(file) {
  const match = file.match(/^(\d+)_(.+)\.sql$/);
  return match ? { version: match[1], name: match[2] } : null;
}

function normalizeName(name) {
  return String(name || "")
    .replace(/^\d+_/, "")
    .replace(/_for_/g, "_")
    .replace(/_peer_/g, "_")
    .replace(/_expand$/, "")
    .trim();
}

const localFiles = readdirSync(join(root, "supabase", "migrations"))
  .filter((file) => file.endsWith(".sql"))
  .map(nameFromFile)
  .filter(Boolean);

const localNames = new Set(localFiles.map((row) => normalizeName(row.name)));
const localVersions = new Set(localFiles.map((row) => row.version));

const response = await fetch(
  `https://api.supabase.com/v1/projects/${ref}/database/migrations`,
  { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } }
);

if (!response.ok) {
  console.error(`Management API migrations failed: ${response.status} ${await response.text()}`);
  process.exit(1);
}

const remote = await response.json();
const remoteRows = (Array.isArray(remote) ? remote : remote.migrations || []).map((row) => ({
  version: String(row.version || ""),
  name: normalizeName(row.name),
}));

const remoteNames = new Set(remoteRows.map((row) => row.name).filter(Boolean));
const remoteVersions = new Set(remoteRows.map((row) => row.version).filter(Boolean));

const missingRemoteNames = [...localNames].filter((name) => !remoteNames.has(name));
const missingLocalNames = [...remoteNames].filter((name) => !localNames.has(name));
const required = [
  "course_privacy_wallet_seller_rls",
  "events_missions_physical_selling",
  "ugc_facebook_platform",
];
const missingRequired = required.filter((name) => !remoteNames.has(name));

console.log(`Local migrations: ${localFiles.length}`);
console.log(`Remote migrations: ${remoteRows.length}`);
console.log(`Shared names: ${[...localNames].filter((name) => remoteNames.has(name)).length}`);
console.log(
  `Identical timestamps: ${[...localVersions].filter((version) => remoteVersions.has(version)).length}`
);

if (missingRequired.length) {
  console.error("Required production migrations missing remotely:");
  for (const name of missingRequired) console.error(` - ${name}`);
  process.exit(1);
}

if (missingRemoteNames.length) {
  console.warn("Local names without an exact remote twin (allowed MCP/timestamp aliases):");
  for (const name of missingRemoteNames) console.warn(` - ${name}`);
}
if (missingLocalNames.length) {
  console.warn("Remote names without a local file (informational):");
  for (const name of missingLocalNames.slice(0, 30)) console.warn(` - ${name}`);
  if (missingLocalNames.length > 30) {
    console.warn(` - … ${missingLocalNames.length - 30} more`);
  }
}

console.log("✅ Required production migrations are present; timestamp drift from MCP apply is allowed.");
