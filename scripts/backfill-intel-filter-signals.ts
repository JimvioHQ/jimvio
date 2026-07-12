/**
 * Backfill trending / supplier_verified / has_video on cj_product_intelligence from CJ raw list data.
 * Usage: npx tsx scripts/backfill-intel-filter-signals.ts [batchSize] [maxBatches]
 */
import { config } from "dotenv";

config({ path: ".env.local" });
config();

async function main() {
  const batchSize = Math.max(1, parseInt(process.argv[2] ?? "500", 10) || 500);
  const maxBatches = Math.max(1, parseInt(process.argv[3] ?? "50", 10) || 50);

  const { backfillIntelFilterSignals } = await import(
    "../lib/cj/premium-intelligence/catalog-repository"
  );
  const { getCatalogDB } = await import("../lib/cj/premium-intelligence/db");
  const db = getCatalogDB();

  let total = 0;
  let offset = 0;
  for (let i = 0; i < maxBatches; i++) {
    const n = await backfillIntelFilterSignals(batchSize, offset);
    total += n;
    offset += n;
    console.log(`batch ${i + 1}: ${n} rows (total ${total}, offset ${offset})`);
    if (n === 0) break;
  }

  const [verified, trending, hasVideo] = await Promise.all([
    db
      .from("cj_product_intelligence")
      .select("pid", { count: "exact", head: true })
      .eq("supplier_verified", true),
    db
      .from("cj_product_intelligence")
      .select("pid", { count: "exact", head: true })
      .eq("trending", true),
    db
      .from("cj_product_intelligence")
      .select("pid", { count: "exact", head: true })
      .eq("has_video", true),
  ]);

  console.log("\nCounts after backfill:");
  console.log("  supplier_verified:", verified.count);
  console.log("  trending:", trending.count);
  console.log("  has_video:", hasVideo.count);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
