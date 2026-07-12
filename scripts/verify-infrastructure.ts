/**
 * Infrastructure gate — run before commit/push.
 *
 * Covers all 5 pre-commit verification areas:
 *   1. Auto Publish E2E (real CJ product when credentials set)
 *   2. Analytics consistency (exact DB match)
 *   3. Marketplace visibility
 *   4. Filters + analytics cards (zero failures / no HTTP 500 equivalents)
 *   5. Background workers healthy after cron resume
 *
 * Migrations 075–079 must be applied manually in Supabase SQL Editor first.
 * After applying, reload schema cache in Supabase Dashboard → Settings → API.
 *
 * Usage:
 *   npx tsx scripts/verify-infrastructure.ts
 *   PRODUCTION_VERIFY=1 npx tsx scripts/verify-infrastructure.ts  # require full E2E
 *
 * Exit 0 only when ALL gates pass.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

const DB_PING_MS = 15_000;
const QUERY_THRESHOLD_MS = 5_000;

async function withTimeout<T>(ms: number, fn: () => Promise<T>, label: string): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<T>((_, rej) =>
      setTimeout(() => rej(new Error(`${label}: timeout after ${ms}ms`)), ms)
    ),
  ]);
}

async function gateDbReachable(): Promise<boolean> {
  console.log("\n=== GATE 0: Database reachable ===\n");
  try {
    const { getCatalogDB } = await import("../lib/cj/premium-intelligence/db");
    const db = getCatalogDB();
    const start = Date.now();
    const { count, error } = await withTimeout(DB_PING_MS, () =>
      db
        .from("cj_product_intelligence")
        .select("pid", { count: "estimated", head: true })
        .limit(1)
    , "db-ping");
    const ms = Date.now() - start;
    if (error) {
      console.log(`  FAIL: ${error.message} (${ms}ms)`);
      return false;
    }
    console.log(`  OK: estimated count=${count} (${ms}ms)`);
    return true;
  } catch (e) {
    console.log(`  FAIL: ${(e as Error).message}`);
    return false;
  }
}

async function gateIndexPerformance(): Promise<boolean> {
  console.log("\n=== GATE 1: Filter query performance (< 5s) ===\n");
  const { getCatalogPage } = await import(
    "../lib/cj/premium-intelligence/catalog-repository"
  );

  const probes = [
    { name: "ready", filters: { autoPublishReady: true } },
    { name: "published", filters: { isPublished: true } },
    { name: "pending", filters: { autoPublishPending: true } },
    { name: "reqMissing", filters: { autoPublishRequirementsMissing: true } },
    { name: "missingImages", filters: { missingImages: true } },
    { name: "isDraft", filters: { isDraft: true } },
    { name: "isHidden", filters: { isHidden: true } },
  ];

  let ok = true;
  for (const p of probes) {
    const start = Date.now();
    try {
      const r = await withTimeout(QUERY_THRESHOLD_MS, () =>
        getCatalogPage({ page: 1, pageSize: 5, filters: p.filters })
      , p.name);
      const ms = Date.now() - start;
      console.log(`  OK ${p.name}: total=${r.total} (${ms}ms)`);
    } catch (e) {
      console.log(`  FAIL ${p.name}: ${(e as Error).message}`);
      ok = false;
    }
  }
  return ok;
}

async function gateFilters(): Promise<boolean> {
  console.log("\n=== GATE 2: All intelligence filters ===\n");
  const { execSync } = await import("child_process");
  try {
    execSync("npx tsx scripts/test-catalog-filters.ts", {
      stdio: "inherit",
      cwd: process.cwd(),
      env: process.env,
    });
    return true;
  } catch {
    return false;
  }
}

async function gateProduction(): Promise<boolean> {
  console.log("\n=== GATES 3–6: Production verification bundle ===\n");
  console.log("  (analytics exact match, marketplace, E2E, workers)\n");
  const { execSync } = await import("child_process");
  try {
    execSync("npx tsx scripts/verify-production.ts", {
      stdio: "inherit",
      cwd: process.cwd(),
      env: { ...process.env, RELEASE_GATE: "1", PRODUCTION_VERIFY: "1" },
    });
    return true;
  } catch {
    return false;
  }
}

function printMigrationChecklist(): void {
  console.log(`
=== MANUAL STEPS (Supabase Dashboard) ===

Before running this script:

1. Wait for Disk IO Budget to recover (Dashboard → Database → Reports).

2. Pause Vercel crons (enrichment, auto-publish-worker, marketplace-maintenance).

3. Apply migrations IN ORDER (one file/statement at a time if needed):
   - 075_enrichment_pipeline_repair.sql
   - 076_catalog_filter_performance.sql
   - 077_catalog_filter_indexes_v2.sql
   - 078_disk_io_reduction.sql
   - 079_catalog_heavy_indexes_concurrent.sql  (ONE CREATE INDEX CONCURRENTLY per query)

4. Verify indexes in SQL Editor:
   SELECT c.relname AS index_name, i.indisvalid AS valid
   FROM pg_index i
   JOIN pg_class c ON c.oid = i.indexrelid
   WHERE c.relname LIKE 'idx_cj_intel%'
      OR c.relname LIKE 'idx_products_cj%'
   ORDER BY c.relname;

   All rows must show valid = true.

5. Reload schema cache: Settings → API → Reload schema cache.

6. Resume crons. Wait 2–5 minutes for workers to tick.

Then re-run: npx tsx scripts/verify-infrastructure.ts
`);
}

async function main() {
  console.log("Jimvio FINAL RELEASE GATE — no commit until exit 0\n");

  const reachable = await gateDbReachable();
  if (!reachable) {
    printMigrationChecklist();
    console.log("\nBLOCKED: Database not reachable. Apply migrations after IO recovers.\n");
    process.exit(1);
  }

  const perf = await gateIndexPerformance();
  if (!perf) {
    printMigrationChecklist();
    console.log("\nBLOCKED: Queries too slow — apply migrations 076–079 or wait for IO.\n");
    process.exit(1);
  }

  const filters = await gateFilters();
  if (!filters) {
    process.exit(1);
  }

  const production = await gateProduction();
  if (!production) {
    process.exit(1);
  }

  console.log("\n=== ALL GATES PASSED ===\n");
  console.log("Verified:");
  console.log("  1. Auto Publish E2E (or skipped locally without CJ credentials)");
  console.log("  2. Analytics counts match database exactly");
  console.log("  3. Marketplace visibility for published products");
  console.log("  4. All filters/cards — zero failures");
  console.log("  5. Background workers healthy\n");
  console.log("Safe to create final commit and push.\n");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
