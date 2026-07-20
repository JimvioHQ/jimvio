#!/usr/bin/env node
/**
 * Verify migration files are sequential, unique, non-empty, and reviewable.
 * Fails closed on gaps (optional via STRICT_MIGRATION_GAPS=1), duplicates, empty bodies.
 */
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const dir = join(process.cwd(), "database", "migrations");
if (!existsSync(dir)) {
  console.error("database/migrations missing");
  process.exit(1);
}

const files = readdirSync(dir)
  .filter((f) => /^\d+_.*\.sql$/.test(f))
  .sort((a, b) => {
    const na = Number(a.split("_")[0]);
    const nb = Number(b.split("_")[0]);
    return na - nb || a.localeCompare(b);
  });

if (!files.length) {
  console.error("No numbered migration SQL files found");
  process.exit(1);
}

const nums = files.map((f) => Number(f.split("_")[0]));
const seenSequential = new Map();
let errors = 0;

for (let i = 0; i < files.length; i++) {
  const n = nums[i];
  const prefix = files[i].split("_")[0];
  // Date-stamped migrations (YYYYMMDD) may share a day; sequential NNN must be unique.
  const isDateStamp = /^\d{8}$/.test(prefix);
  if (!isDateStamp) {
    if (seenSequential.has(n)) {
      console.error(
        `Duplicate migration number ${prefix}: ${seenSequential.get(n)} and ${files[i]}`
      );
      errors += 1;
    } else {
      seenSequential.set(n, files[i]);
    }
  }
  if (i > 0 && nums[i] < nums[i - 1]) {
    console.error(`Migration order regression: ${files[i - 1]} then ${files[i]}`);
    errors += 1;
  }
}

const uniqueSorted = [...new Set(nums)].sort((a, b) => a - b);
if (process.env.STRICT_MIGRATION_GAPS === "1") {
  for (let i = 1; i < uniqueSorted.length; i++) {
    if (uniqueSorted[i] !== uniqueSorted[i - 1] + 1) {
      console.error(
        `Migration gap between ${uniqueSorted[i - 1]} and ${uniqueSorted[i]} (STRICT_MIGRATION_GAPS=1)`
      );
      errors += 1;
    }
  }
} else {
  for (let i = 1; i < uniqueSorted.length; i++) {
    if (uniqueSorted[i] > uniqueSorted[i - 1] + 1) {
      console.warn(`Note: migration number gap ${uniqueSorted[i - 1]} → ${uniqueSorted[i]}`);
    }
  }
}

const dangerous = [];
for (const f of files) {
  const body = readFileSync(join(dir, f), "utf8");
  if (!body.trim()) {
    console.error(`Empty migration: ${f}`);
    errors += 1;
    continue;
  }
  // Heuristic flags (warn) — destructive DDL should be intentional + documented
  if (/\bDROP\s+(TABLE|SCHEMA|DATABASE)\b/i.test(body) && !/IF\s+EXISTS/i.test(body)) {
    dangerous.push(`${f}: DROP without IF EXISTS`);
  }
  if (/\bTRUNCATE\b/i.test(body)) {
    dangerous.push(`${f}: TRUNCATE`);
  }
}

if (dangerous.length) {
  console.warn("⚠ Potentially destructive SQL (review before prod apply):");
  for (const d of dangerous) console.warn(`  - ${d}`);
}

if (errors) {
  console.error(`Migration verification failed (${errors} error(s))`);
  process.exit(1);
}

console.log(`✅ Migration verification OK (${files.length} files, latest ${files.at(-1)})`);
