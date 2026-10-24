#!/usr/bin/env node
/**
 * Apply only allowlisted pending migrations on a linked Supabase project.
 *
 * Refuses to run when history has drifted, a pending file is missing from
 * scripts/release/eligible-migrations.json, or a pending file contains
 * destructive SQL. Never uses db reset, --include-all, or migration repair.
 *
 * APPLY_MIGRATIONS=1 runs `supabase db push` after a dry-run. Any other value
 * prints the plan and exits without connecting to the database password path.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const token = (process.env.SUPABASE_ACCESS_TOKEN || "").trim();
const ref = (process.env.SUPABASE_PROJECT_REF || "").trim();
const apply = process.env.APPLY_MIGRATIONS === "1";

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
  return match ? { version: match[1], name: match[2], file } : null;
}

function stripComments(sql) {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/--[^\n]*/g, "");
}

function isDestructive(sql) {
  const body = stripComments(sql);
  return [
    /^\s*truncate\b/im,
    /^\s*delete\s+from\b/im,
    /^\s*drop\s+table\b/im,
    /^\s*drop\s+schema\b/im,
    /^\s*drop\s+database\b/im,
    /^\s*update\s+[a-z0-9_."]+/im,
  ].some((pattern) => pattern.test(body));
}

const localFiles = readdirSync(join(root, "supabase", "migrations"))
  .filter((file) => file.endsWith(".sql"))
  .map(fromFile)
  .filter(Boolean);
const localByVersion = new Map(localFiles.map((file) => [file.version, file]));

const response = await fetch(
  `https://api.supabase.com/v1/projects/${ref}/database/migrations`,
  { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } }
);
if (!response.ok) {
  console.error(`Management API migrations failed: HTTP ${response.status}`);
  process.exit(1);
}
const remote = await response.json();
const remoteVersions = new Set(
  (Array.isArray(remote) ? remote : remote.migrations || [])
    .map((row) => String(row.version || ""))
    .filter(Boolean)
);

const remoteOnly = [...remoteVersions].filter((version) => !localByVersion.has(version)).sort();
const pending = [...localByVersion.keys()].filter((version) => !remoteVersions.has(version)).sort();

if (remoteOnly.length) {
  console.error("Remote history has versions with no local file:");
  for (const version of remoteOnly) console.error(` - ${version}`);
  process.exit(1);
}

const allowlist = JSON.parse(
  readFileSync(join(root, "scripts/release/eligible-migrations.json"), "utf8")
);
const allowed = new Set(
  (Array.isArray(allowlist.versions) ? allowlist.versions : []).map((version) => String(version))
);

console.log(`Pending migrations: ${pending.length}`);
for (const version of pending) console.log(` - ${version}_${localByVersion.get(version).name}`);

if (!pending.length) {
  console.log("No pending migrations. Database push skipped.");
  process.exit(0);
}

const blocked = pending.filter((version) => !allowed.has(version));
if (blocked.length) {
  console.error("Pending migrations are not in scripts/release/eligible-migrations.json:");
  for (const version of blocked) console.error(` - ${version}_${localByVersion.get(version).name}`);
  console.error("Not applied.");
  process.exit(1);
}

const destructive = pending.filter((version) =>
  isDestructive(readFileSync(join(root, "supabase/migrations", localByVersion.get(version).file), "utf8"))
);
if (destructive.length) {
  console.error("Pending migrations contain destructive or data-updating SQL and were not applied:");
  for (const version of destructive) console.error(` - ${version}_${localByVersion.get(version).name}`);
  process.exit(1);
}

if (!apply) {
  console.log("APPLY_MIGRATIONS is not 1. Dry plan only; nothing was applied.");
  process.exit(0);
}

if (!process.env.SUPABASE_DB_PASSWORD) {
  console.error("Missing SUPABASE_DB_PASSWORD. Not applying migrations.");
  process.exit(1);
}

function run(args) {
  const installed = spawnSync("supabase", ["--version"], { encoding: "utf8" });
  const command = installed.status === 0 ? "supabase" : "npx";
  const commandArgs = installed.status === 0 ? args : ["supabase", ...args];
  const result = spawnSync(command, commandArgs, {
    cwd: root,
    env: process.env,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const output = `${result.stdout || ""}\n${result.stderr || ""}`;
  const redacted = output.replace(/postgres(?:ql)?:\/\/[^\s]+/gi, "[redacted-db-url]");
  process.stdout.write(redacted);
  if (result.status !== 0) process.exit(result.status || 1);
  return redacted;
}

run(["link", "--project-ref", ref, "--yes"]);
const dryRun = run(["db", "push", "--linked", "--dry-run", "--yes"]);
const planned = [...dryRun.matchAll(/\b(\d{14})\b/g)].map((match) => match[1]);
const uniquePlanned = [...new Set(planned)].filter((version) => pending.includes(version));
const unexpected = uniquePlanned.filter((version) => !allowed.has(version));
if (unexpected.length || uniquePlanned.length !== pending.length) {
  console.error("Dry-run did not match the allowlisted pending set. Not applying.");
  console.error(`Planned: ${uniquePlanned.join(", ") || "(none)"}`);
  console.error(`Pending: ${pending.join(", ")}`);
  process.exit(1);
}

run(["db", "push", "--linked", "--yes"]);
console.log("Eligible migrations applied.");
