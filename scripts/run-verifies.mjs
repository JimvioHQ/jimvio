#!/usr/bin/env node
/**
 * Runs scripts/tmp/verify-*.mjs (fast static test gate).
 * Full release gate: npm run ci:prepush
 *
 * Targeted runs (dev speed):
 *   VERIFY_FILTER=community npm test
 *   npm run test:community
 *   npm run test:live
 *   npm run test:ugc
 */
import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const dir = join(process.cwd(), "scripts", "tmp");
if (!existsSync(dir)) {
  console.log("No scripts/tmp — nothing to verify");
  process.exit(0);
}

const filterRaw = (process.env.VERIFY_FILTER || "").trim().toLowerCase();
const filters = filterRaw
  ? filterRaw.split(",").map((s) => s.trim()).filter(Boolean)
  : [];

let files = readdirSync(dir)
  .filter((f) => f.startsWith("verify-") && f.endsWith(".mjs"))
  .sort();

if (filters.length) {
  files = files.filter((f) => {
    const name = f.toLowerCase();
    return filters.some((frag) => name.includes(frag));
  });
  if (!files.length) {
    console.error(
      `No verify-*.mjs matched VERIFY_FILTER=${JSON.stringify(filterRaw)}`
    );
    process.exit(1);
  }
  console.log(
    `Targeted verify (${files.length}): ${filters.join(", ")}`
  );
}

if (!files.length) {
  console.log("No verify-*.mjs scripts");
  process.exit(0);
}

for (const f of files) {
  console.log(`→ ${f}`);
  const r = spawnSync(process.execPath, [join(dir, f)], { stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
console.log(
  filters.length
    ? `✅ Targeted verification passed (${files.length} scripts)`
    : "✅ All verification scripts passed"
);
