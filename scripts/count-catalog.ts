import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

async function main() {
  for (const table of [
    "cj_raw_products",
    "cj_product_intelligence",
    "cj_enrichment_queue",
    "cj_catalog_sync_runs",
  ]) {
    const { count, error } = await db.from(table).select("*", { count: "exact", head: true });
    console.log(table, error?.message ?? count);
  }

  const { count: pending } = await db
    .from("cj_product_intelligence")
    .select("*", { count: "exact", head: true })
    .eq("catalog_tier", "PENDING");
  console.log("pending_tier", pending);
}

main();
