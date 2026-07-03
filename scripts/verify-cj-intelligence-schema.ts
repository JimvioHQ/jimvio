/**
 * Verify CJ Premium Intelligence tables exist and print row counts.
 * Usage: npx tsx scripts/verify-cj-intelligence-schema.ts
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });
config();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const TABLES = [
  "cj_raw_products",
  "cj_product_intelligence",
  "cj_enrichment_queue",
  "cj_catalog_sync_runs",
] as const;

async function main() {
  const db = createClient(url!, key!, { auth: { persistSession: false } });
  const missing: string[] = [];

  console.log("CJ Premium Intelligence — schema verification\n");

  for (const table of TABLES) {
    const { count, error } = await db.from(table).select("*", { count: "exact" }).limit(1);

    if (error) {
      missing.push(table);
      console.log(`✗ ${table}: ${error.message}`);
    } else {
      console.log(`✓ ${table}: ${count ?? 0} rows`);
    }
  }

  if (missing.length > 0) {
    console.log(`\nMissing tables: ${missing.join(", ")}`);
    console.log(
      "1. Run database/migrations/065_cj_premium_intelligence.sql in Supabase SQL Editor"
    );
    console.log(
      "2. Supabase Dashboard → Settings → API → Reload schema cache"
    );
    process.exit(1);
  }

  console.log("\nAll tables present.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
