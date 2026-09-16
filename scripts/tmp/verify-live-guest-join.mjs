#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const tests = [
  "lib/live/guest-join.test.ts",
  "lib/live/participant-state.test.ts",
  "lib/live/chat-message-state.test.ts",
  "lib/live/control-dock-visibility.test.ts",
];

let failed = 0;
for (const rel of tests) {
  const file = join(root, rel);
  console.log(`→ ${rel}`);
  const r = spawnSync(process.execPath, ["--import", "tsx", "--test", file], {
    stdio: "inherit",
    cwd: root,
  });
  if (r.status !== 0) failed += 1;
}

if (failed) {
  console.error(`❌ Live guest-join verify failed (${failed} suites)`);
  process.exit(1);
}
console.log("✅ Live guest-join + realtime verify passed");
