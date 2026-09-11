#!/usr/bin/env node
import { existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const required = [
  "lib/dropshipping/suppliers/types.ts",
  "lib/dropshipping/suppliers/cj-connector.ts",
  "lib/dropshipping/stores/shopify-connector.ts",
  "lib/dropshipping/pricing/engine.ts",
  "lib/dropshipping/orders/ingest.ts",
  "lib/dropshipping/fulfillment/router.ts",
  "lib/dropshipping/sync/engine.ts",
  "app/(public)/dropshipping/page.tsx",
  "app/admin/dropshipping/page.tsx",
  "app/api/v1/orders/route.ts",
  "app/api/webhooks/dropshipping/shopify/route.ts",
  "database/migrations/156_dropshipping_os.sql",
  "docs/dropshipping/ARCHITECTURE.md",
];

let failed = 0;
for (const rel of required) {
  if (!existsSync(join(root, rel))) {
    console.error(`Missing: ${rel}`);
    failed += 1;
  }
}
if (failed) {
  console.error(`Dropshipping OS verify failed (${failed} missing)`);
  process.exit(1);
}
console.log(`Dropshipping OS static verify OK (${required.length} paths)`);
