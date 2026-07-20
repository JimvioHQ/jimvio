#!/usr/bin/env node
/** Verify migration files are sequential and present. */
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const dir = join(process.cwd(), "database", "migrations");
if (!existsSync(dir)) {
  console.error("database/migrations missing");
  process.exit(1);
}

const files = readdirSync(dir)
  .filter((f) => /^\d+_.*\.sql$/.test(f))
  .sort();

if (!files.length) {
  console.error("No numbered migration SQL files found");
  process.exit(1);
}

const nums = files.map((f) => Number(f.split("_")[0]));
for (let i = 1; i < nums.length; i++) {
  if (nums[i] < nums[i - 1]) {
    console.error(`Migration order regression: ${files[i - 1]} then ${files[i]}`);
    process.exit(1);
  }
}

let empty = 0;
for (const f of files) {
  const body = readFileSync(join(dir, f), "utf8").trim();
  if (!body) {
    console.error(`Empty migration: ${f}`);
    empty += 1;
  }
}
if (empty) process.exit(1);

console.log(`✅ Migration verification OK (${files.length} files, latest ${files.at(-1)})`);
