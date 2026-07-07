import { config } from "dotenv";
config({ path: ".env.local" });
config();

async function main() {
  const { getCatalogDB } = await import("../lib/cj/premium-intelligence/db");
  const db = getCatalogDB();

  const { data: rows } = await db
    .from("cj_product_intelligence")
    .select("pid, has_video, supplier_verified, delivery_days, image_count, trending, enrichment_status")
    .eq("enrichment_status", "complete")
    .eq("has_video", true)
    .eq("supplier_verified", true)
    .lte("delivery_days", 7)
    .gte("image_count", 5)
    .limit(50);

  console.log("Strict filter matches:", rows?.length ?? 0);
  console.log(JSON.stringify(rows?.slice(0, 10), null, 2));

  const { data: trendingRows } = await db
    .from("cj_product_intelligence")
    .select("pid, has_video, supplier_verified, delivery_days, image_count, trending")
    .eq("enrichment_status", "complete")
    .eq("has_video", true)
    .gte("image_count", 5)
    .eq("trending", true)
    .limit(20);

  console.log("\nTrending+video matches:", trendingRows?.length ?? 0);
}

main().catch(console.error);
