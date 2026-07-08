/**
 * Profile DB query latency for catalog pipeline paths.
 * Usage: npx tsx scripts/profile-db-io.ts
 *
 * Run ONE script at a time while Supabase Disk IO is constrained.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

const SLOW_MS = 2000;

async function timed(label: string, fn: () => Promise<unknown>): Promise<void> {
  const start = Date.now();
  try {
    await fn();
    const ms = Date.now() - start;
    const flag = ms >= SLOW_MS ? "SLOW" : "OK";
    console.log(`${flag} ${label} (${ms}ms)`);
  } catch (e) {
    console.log(`FAIL ${label} (${Date.now() - start}ms): ${(e as Error).message}`);
  }
}

async function main() {
  console.log("\n=== DB IO Profile (threshold 2000ms) ===\n");

  const { getCatalogPage } = await import(
    "../lib/cj/premium-intelligence/catalog-repository"
  );
  const { computeCatalogFilterCounts } = await import(
    "../lib/cj/premium-intelligence/catalog-filter-index"
  );
  const { computeAutoPublishAnalytics } = await import(
    "../lib/cj/premium-intelligence/auto-publish-analytics"
  );
  const { computeMarketplacePipelineMetrics } = await import(
    "../lib/cj/premium-intelligence/marketplace-pipeline-metrics"
  );
  const { runCatalogScannerBatch } = await import(
    "../lib/cj/premium-intelligence/catalog-scanner"
  );
  const { processEnrichmentQueue } = await import(
    "../lib/cj/premium-intelligence/process-enrichment-queue"
  );
  const { getMarketplaceVisibilitySets } = await import(
    "../lib/cj/premium-intelligence/marketplace-filter"
  );
  const { searchIndexPids } = await import(
    "../lib/cj/premium-intelligence/search-index"
  );

  await timed("filter: ready", () =>
    getCatalogPage({ page: 1, pageSize: 5, filters: { autoPublishReady: true } })
  );
  await timed("filter: missingImages", () =>
    getCatalogPage({ page: 1, pageSize: 5, filters: { missingImages: true } })
  );
  await timed("filter: isDraft", () =>
    getCatalogPage({ page: 1, pageSize: 5, filters: { isDraft: true } })
  );
  await timed("filter: isHidden", () =>
    getCatalogPage({ page: 1, pageSize: 5, filters: { isHidden: true } })
  );
  await timed("search index", () => searchIndexPids("test", 10));
  await timed("computeCatalogFilterCounts", () => computeCatalogFilterCounts());
  await timed("computeMarketplacePipelineMetrics", () =>
    computeMarketplacePipelineMetrics()
  );
  await timed("computeAutoPublishAnalytics", () => computeAutoPublishAnalytics());
  await timed("getMarketplaceVisibilitySets", () => getMarketplaceVisibilitySets());
  await timed("scanner batch (25)", () => runCatalogScannerBatch(25));
  await timed("enrichment batch (5)", () => processEnrichmentQueue(5));

  console.log("\nApply migrations 076, 077, 078 in Supabase before interpreting results.\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
