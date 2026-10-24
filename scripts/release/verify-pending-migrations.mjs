#!/usr/bin/env node
/**
 * Approve or reject local-only migrations before any database push.
 * Does not link, push, reset, repair, or execute SQL.
 */
import { evaluatePending } from "./migration-policy.mjs";
import {
  fetchRemoteMigrations,
  loadAllowlist,
  loadLocalMigrations,
  readSupabaseAuth,
} from "./migration-state.mjs";

const root = process.cwd();
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

console.log(`Approved pending migrations: ${decision.approved.length}`);
for (const version of decision.approved) console.log(` - ${version}`);
console.log("Pending migration check applied no schema changes.");
