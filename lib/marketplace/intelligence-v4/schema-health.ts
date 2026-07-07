/**
 * Marketplace Intelligence v4 — schema health check.
 */

import { getIntelligenceDB } from "./db";

const REQUIRED_TABLES = [
  "marketplace_product_intelligence",
  "marketplace_trending_hourly",
  "marketplace_intelligence_analytics",
  "marketplace_intelligence_events",
] as const;

export type IntelligenceTable = (typeof REQUIRED_TABLES)[number];

export interface IntelligenceSchemaHealth {
  ready: boolean;
  tables: Record<IntelligenceTable, boolean>;
  missingTables: IntelligenceTable[];
  migrationFile: string;
}

export async function getIntelligenceSchemaHealth(): Promise<IntelligenceSchemaHealth> {
  const db = getIntelligenceDB();
  const tables = {} as Record<IntelligenceTable, boolean>;

  for (const table of REQUIRED_TABLES) {
    const { error } = await db.from(table).select("*").limit(1);
    tables[table] = !error;
  }

  const missingTables = REQUIRED_TABLES.filter((t) => !tables[t]);
  return {
    ready: missingTables.length === 0,
    tables,
    missingTables,
    migrationFile: "database/migrations/070_marketplace_intelligence_v4.sql",
  };
}
