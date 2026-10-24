#!/usr/bin/env node
/**
 * Apply only the exact allowlisted pending set on a linked Supabase project.
 *
 * Refuses unexplained remote history, versions outside the allowlist, versions
 * that are not newer than the remote history, destructive SQL, and a dry-run
 * plan that is not the approved set. Never uses db reset, --include-all, or
 * migration repair.
 *
 * APPLY_MIGRATIONS=1 runs `supabase db push` after a matching dry-run.
 */
import { spawnSync } from "node:child_process";
import {
  dbPushArgs,
  dryRunMatchesApprovedSet,
  evaluatePending,
  linkArgs,
  plannedMigrationVersions,
} from "./migration-policy.mjs";
import {
  fetchRemoteMigrations,
  loadAllowlist,
  loadLocalMigrations,
  readSupabaseAuth,
} from "./migration-state.mjs";

const root = process.cwd();
const apply = process.env.APPLY_MIGRATIONS === "1";
const auth = readSupabaseAuth(process.env);
if (!auth.ok) {
  console.error(auth.message);
  process.exit(1);
}

const allowlist = loadAllowlist(root);
if (!allowlist.ok) {
  console.error(allowlist.message);
  process.exit(1);
}

const local = loadLocalMigrations(root);
let remote;
try {
  remote = await fetchRemoteMigrations(auth);
} catch (error) {
  console.error(error instanceof Error ? error.message : "Management API migrations failed");
  process.exit(1);
}

const decision = evaluatePending({ local, remote, allowlist: allowlist.versions });
console.log(`Pending migrations: ${decision.pending.length}`);
for (const pending of decision.pending) {
  console.log(` - ${pending.version}${pending.name ? `_${pending.name}` : ""}`);
}

if (!decision.ok) {
  console.error("Pending migration approval failed.");
  for (const error of decision.errors) console.error(` - ${error.message}`);
  console.error("Not applied.");
  process.exit(1);
}

if (!decision.approved.length) {
  console.log("No pending migrations. Database push skipped.");
  process.exit(0);
}

if (!apply) {
  console.log("APPLY_MIGRATIONS is not 1. Dry plan only; nothing was applied.");
  process.exit(0);
}

if (!process.env.SUPABASE_DB_PASSWORD) {
  console.error("Missing SUPABASE_DB_PASSWORD. Not applying migrations.");
  process.exit(1);
}

const commands = [linkArgs(auth.ref), dbPushArgs(true), dbPushArgs(false)];
for (const args of commands) {
  if (args.includes("--include-all") || args.includes("reset") || args.includes("repair")) {
    console.error("Refusing unsafe Supabase arguments. Not applying migrations.");
    process.exit(1);
  }
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

run(linkArgs(auth.ref));
const dryRun = run(dbPushArgs(true));
if (!dryRunMatchesApprovedSet(dryRun, decision.approved)) {
  const planned = plannedMigrationVersions(dryRun);
  console.error("Dry-run did not match the allowlisted pending set. Not applying.");
  console.error(`Planned: ${planned.join(", ") || "(none)"}`);
  console.error(`Approved: ${decision.approved.join(", ")}`);
  process.exit(1);
}

run(dbPushArgs(false));
console.log("Eligible migrations applied.");
