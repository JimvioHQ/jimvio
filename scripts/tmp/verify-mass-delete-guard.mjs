/**
 * Mass-delete guard — blocks unconstrained table wipes from recurring.
 * Auto-picked up by ci:prepush via scripts/tmp/verify-*.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function mustExist(rel) {
  const p = path.join(root, rel);
  assert.ok(fs.existsSync(p), `missing ${rel}`);
  return fs.readFileSync(p, "utf8");
}

const dbMig = mustExist("database/migrations/128_prevent_unbounded_mass_deletes.sql");
const sbMig = mustExist("supabase/migrations/20260824071056_prevent_unbounded_mass_deletes.sql");

for (const sql of [dbMig, sbMig]) {
  assert.match(sql, /deny_unbounded_mass_delete/);
  assert.match(sql, /trg_deny_unbounded_mass_delete/);
  assert.match(sql, /jimvio\.allow_mass_delete/);
  assert.match(sql, /pg_trigger_depth\(\)/);
  assert.match(sql, /communities/);
  assert.match(sql, /community_posts/);
  assert.match(sql, /orders/);
  assert.doesNotMatch(sql, /\bTRUNCATE\b/i);
  assert.doesNotMatch(sql, /DROP TABLE/i);
  assert.doesNotMatch(sql, /USING\s*\(\s*true\s*\)/i);
}

const shopify = mustExist("services/shopifyProductSync.ts");
assert.match(shopify, /cleanupOrphanedShopifyProducts/);
assert.match(shopify, /\.eq\("source", "shopify"\)/);
assert.match(shopify, /\.in\("id", chunk\)/);
assert.doesNotMatch(
  shopify,
  /\.delete\(\)\s*\n\s*\.eq\("source", "shopify"\)\s*\n\s*\.not\("vendor_id"/,
);

console.log("Mass-delete guard verification passed.");
