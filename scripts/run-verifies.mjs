#!/usr/bin/env node
/** Runs scripts/tmp/verify-*.mjs (fast test gate). Full release gate: npm run ci:prepush */
import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const dir = join(process.cwd(), "scripts", "tmp");
if (!existsSync(dir)) {
  console.log("No scripts/tmp — nothing to verify");
  process.exit(0);
}
const files = readdirSync(dir)
  .filter((f) => f.startsWith("verify-") && f.endsWith(".mjs"))
  .sort();
if (!files.length) {
  console.log("No verify-*.mjs scripts");
  process.exit(0);
}
for (const f of files) {
  console.log(`→ ${f}`);
  const r = spawnSync(process.execPath, [join(dir, f)], { stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
console.log("✅ All verification scripts passed");
