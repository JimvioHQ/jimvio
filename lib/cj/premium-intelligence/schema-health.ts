import { getCatalogDB } from "./db";

const REQUIRED_TABLES = [
  "cj_raw_products",
  "cj_product_intelligence",
  "cj_enrichment_queue",
  "cj_catalog_sync_runs",
] as const;

export type CatalogTable = (typeof REQUIRED_TABLES)[number];

export interface SchemaHealth {
  ready: boolean;
  tables: Record<CatalogTable, boolean>;
  missingTables: CatalogTable[];
  migrationFile: string;
  afterMigration: string;
}

export async function getSchemaHealth(): Promise<SchemaHealth> {
  const db = getCatalogDB();
  const tables = {} as Record<CatalogTable, boolean>;

  for (const table of REQUIRED_TABLES) {
    const { error } = await db.from(table).select("*").limit(1);
    tables[table] = !error;
  }

  const missingTables = REQUIRED_TABLES.filter((t) => !tables[t]);
  return {
    ready: missingTables.length === 0,
    tables,
    missingTables,
    migrationFile: "database/migrations/065_cj_premium_intelligence.sql",
    afterMigration:
      "In Supabase Dashboard → Settings → API → Reload schema cache (or restart the project).",
  };
}

export const VERIFICATION_SQL = `
SELECT COUNT(*) AS cj_raw_products FROM public.cj_raw_products;
SELECT COUNT(*) AS cj_product_intelligence FROM public.cj_product_intelligence;
SELECT COUNT(*) AS cj_enrichment_queue FROM public.cj_enrichment_queue;
SELECT COUNT(*) AS cj_catalog_sync_runs FROM public.cj_catalog_sync_runs;
`.trim();
