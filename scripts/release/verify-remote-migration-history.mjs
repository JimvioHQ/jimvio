#!/usr/bin/env node
/**
 * Baseline history check.
 *
 * Fail closed on duplicate versions, remote-only versions with no local file,
 * and same-version name mismatches. A local-only file is a pending candidate
 * and is validated by verify-pending-migrations.mjs. This check never runs SQL,
 * repairs history, or pushes migrations.
 */
import { evaluateBaseline } from "./migration-policy.mjs";
import {
  fetchRemoteMigrations,
  loadLocalMigrations,
  readSupabaseAuth,
} from "./migration-state.mjs";

const root = process.cwd();
const auth = readSupabaseAuth(process.env);
if (!auth.ok) {
  console.error(auth.message);
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

const baseline = evaluateBaseline(local, remote);
console.log(`Local migrations: ${baseline.localCount}`);
console.log(`Remote migrations: ${baseline.remoteCount}`);
console.log(`Matched versions: ${baseline.matched}`);
console.log(`Pending local migrations: ${baseline.pending.length}`);
for (const pending of baseline.pending) {
  console.log(` - ${pending.version}${pending.name ? `_${pending.name}` : ""}`);
}

if (!baseline.ok) {
  console.error("Migration history baseline does not match supabase/migrations.");
  for (const error of baseline.errors) console.error(` - ${error.message}`);
  console.error("Refusing to continue. Do not repair or push until each remote-only version is proven.");
  process.exit(1);
}

console.log("Baseline history matches. Pending migrations are validated separately. No schema changes were applied.");
