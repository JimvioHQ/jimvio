import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  const { getCatalogDB } = await import("../lib/cj/premium-intelligence/db");
  const db = getCatalogDB();
  const { data } = await db
    .from("cj_product_intelligence")
    .select("pid, auto_publish_failures")
    .eq("auto_publish_status", "REQUIREMENTS_MISSING")
    .limit(10);
  for (const row of data ?? []) {
    console.log(row.pid, JSON.stringify(row.auto_publish_failures));
  }
}

main().catch(console.error);
