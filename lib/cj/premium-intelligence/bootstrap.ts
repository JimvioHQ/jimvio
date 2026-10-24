import {
  backfillIntelligenceFromRaw,
  enqueueMissingEnrichment,
  getRawCatalogTotal,
  getTierCounts,
} from "./catalog-repository";
import { getSchemaHealth } from "./schema-health";
import { processEnrichmentQueue } from "./process-enrichment-queue";
import { syncCjListCatalog } from "./score-product";

export interface BootstrapResult {
  schemaReady: boolean;
  missingTables: string[];
  rawCount: number;
  backfilled: number;
  enqueued: number;
  tierCounts: Awaited<ReturnType<typeof getTierCounts>>;
  syncStarted: boolean;
  syncError?: string;
  enrichment?: Awaited<ReturnType<typeof processEnrichmentQueue>>;
}

/** Ensure intelligence rows exist for every raw product; trigger sync if catalog empty. */
export async function bootstrapCatalog(options?: {
  runSyncIfEmpty?: boolean;
  runEnrichment?: boolean;
}): Promise<BootstrapResult> {
  const health = await getSchemaHealth();
  if (!health.ready) {
    return {
      schemaReady: false,
      missingTables: health.missingTables,
      rawCount: 0,
      backfilled: 0,
      enqueued: 0,
      tierCounts: {
        ELITE: 0,
        PREMIUM: 0,
        STANDARD: 0,
        PENDING: 0,
        HIDDEN: 0,
      },
      syncStarted: false,
      syncError: `Missing tables: ${health.missingTables.join(", ")}. Run ${health.migrationFile}. Then ${health.afterMigration}`,
    };
  }

  let rawCount = await getRawCatalogTotal();
  let syncError: string | undefined;
  let syncStarted = false;

  if (rawCount === 0 && options?.runSyncIfEmpty !== false) {
    syncStarted = true;
    try {
      await syncCjListCatalog({ maxPages: 15, maxDurationMs: 120_000 });
      rawCount = await getRawCatalogTotal();
    } catch (err) {
      syncError = err instanceof Error ? err.message : "Catalog sync failed";
    }
  }

  const backfilled = await backfillIntelligenceFromRaw();
  const enqueued = await enqueueMissingEnrichment();
  const tierCounts = await getTierCounts();

  let enrichment: BootstrapResult["enrichment"];
  if (options?.runEnrichment && enqueued > 0) {
    enrichment = await processEnrichmentQueue(25);
  }

  return {
    schemaReady: true,
    missingTables: [],
    rawCount,
    backfilled,
    enqueued,
    tierCounts,
    syncStarted,
    syncError,
    enrichment,
  };
}
