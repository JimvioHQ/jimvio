#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const files = [
  "lib/products/resolve-purchase-line.test.ts",
  "lib/cj/catalog-variants.test.ts",
  "lib/cj/customer-facing.test.ts",
  "lib/marketplace/store-display.test.ts",
];

const result = spawnSync("npx", ["tsx", "--test", ...files], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
