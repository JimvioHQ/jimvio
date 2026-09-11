#!/usr/bin/env node
import { existsSync } from "node:fs";
import { join } from "node:path";
const root = process.cwd();
const required = [
  "lib/commerce-os/index.ts",
  "lib/commerce-os/stores.ts",
  "database/migrations/157_commerce_os.sql",
  "app/(public)/commerce/page.tsx",
  "app/(public)/s/[handle]/page.tsx",
  "app/api/commerce/stores/route.ts",
  "components/commerce-os/commerce-shell.tsx",
  "components/commerce-os/sell-to-store-button.tsx",
  "docs/commerce-os/ARCHITECTURE.md",
];
let failed = 0;
for (const rel of required) {
  if (!existsSync(join(root, rel))) { console.error("Missing:", rel); failed++; }
}
if (failed) process.exit(1);
console.log("Commerce OS static verify OK (" + required.length + " paths)");
