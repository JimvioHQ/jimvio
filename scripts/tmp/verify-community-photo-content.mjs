#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const r = spawnSync(
  process.execPath,
  ["--import", "tsx", join(root, "scripts", "verify-community-photo-content.ts")],
  { stdio: "inherit", cwd: root }
);
process.exit(r.status ?? 1);
