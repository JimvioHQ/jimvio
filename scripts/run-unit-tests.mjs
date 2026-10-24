#!/usr/bin/env node
/**
 * Isolated unit/regression tests (node:test via tsx).
 * Does not hit production databases or payment providers.
 */
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const skipSuffixes = [".perf.test.ts", ".integration.test.ts"];

function walk(dir, acc = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return acc;
  }
  for (const entry of entries) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      walk(full, acc);
      continue;
    }
    if (!entry.endsWith(".test.ts")) continue;
    if (skipSuffixes.some((suffix) => entry.endsWith(suffix))) continue;
    acc.push(full);
  }
  return acc;
}

const files = ["lib", "services"].flatMap((dir) => walk(join(root, dir)));
const migrationPolicyTest = join(root, "scripts/release/migration-policy.test.mjs");
files.push(migrationPolicyTest);
if (files.length === 1) {
  console.error("No *.test.ts files found under lib/ or services/");
  process.exit(1);
}

console.log(`Unit tests: ${files.length} files`);
const result = spawnSync(
  "npx",
  ["tsx", "--test", "--test-timeout=20000", ...files],
  { cwd: root, stdio: "inherit", env: process.env, shell: false }
);
process.exit(result.status ?? 1);
