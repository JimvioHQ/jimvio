/**
 * Bootstrap CJ Premium Intelligence: sync list catalog, backfill PENDING rows, enqueue enrichment.
 * Usage: npx tsx scripts/bootstrap-cj-intelligence.ts
 */
import { config } from "dotenv";

config({ path: ".env.local" });
config();

async function main() {
  const { bootstrapCatalog } = await import(
    "../lib/cj/premium-intelligence/bootstrap"
  );
  const { getSchemaHealth, VERIFICATION_SQL } = await import(
    "../lib/cj/premium-intelligence/schema-health"
  );
  const { getCatalogMonitoring } = await import(
    "../lib/cj/premium-intelligence/catalog-repository"
  );

  const health = await getSchemaHealth();
  if (!health.ready) {
    console.error("Schema not ready:", health.missingTables);
    console.error("Run:", health.migrationFile);
    process.exit(1);
  }

  console.log("Starting bootstrap (sync + backfill + enrichment batch)...\n");
  const result = await bootstrapCatalog({
    runSyncIfEmpty: true,
    runEnrichment: true,
  });

  console.log(JSON.stringify(result, null, 2));
  console.log("\nVerification SQL:\n", VERIFICATION_SQL);

  const monitoring = await getCatalogMonitoring();
  console.log("\nMonitoring:", JSON.stringify(monitoring, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
