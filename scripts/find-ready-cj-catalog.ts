import { config } from "dotenv";
config({ path: ".env.local" });
config();

async function main() {
  const { getCatalogDB } = await import("../lib/cj/premium-intelligence/db");
  const { enrichProduct } = await import("../lib/cj/import-intelligence/filters");
  const { rawRowToCJProduct } = await import("../lib/cj/premium-intelligence/map-to-cj-product");
  const { evaluateV3Intelligence } = await import("../lib/cj/premium-intelligence/v3-pipeline");
  const { evaluateAutoPublish } = await import("../lib/cj/import-intelligence/auto-publish-engine");

  const db = getCatalogDB();

  const { data: rows } = await db
    .from("cj_product_intelligence")
    .select("pid, enrichment_status, has_video, supplier_verified, delivery_days, image_count, trending, catalog_tier")
    .eq("enrichment_status", "complete")
    .eq("has_video", true)
    .gte("image_count", 5)
    .limit(200);

  const candidates: unknown[] = [];

  for (const row of rows ?? []) {
    const pid = row.pid as string;
    const { data: raw } = await db.from("cj_raw_products").select("*").eq("pid", pid).maybeSingle();
    if (!raw) continue;

    const cj = rawRowToCJProduct(raw, row);
    const enriched = enrichProduct(cj, {});
    enriched.intelligence.enrichmentStatus = "complete";
    enriched.intelligence.trending = row.trending;

    const ap = evaluateAutoPublish(enriched);
    if (ap.score < 75) continue;

    const v3 = evaluateV3Intelligence(enriched);
    candidates.push({
      pid,
      title: raw.title?.slice(0, 50),
      score: ap.score,
      ready: ap.ready && !v3.blocked,
      failures: [...ap.failures, ...v3.blockReasons],
      listedNum: cj.listedNum,
      delivery_days: row.delivery_days,
      supplier_verified: row.supplier_verified,
      catalog_tier: row.catalog_tier,
    });
  }

  candidates.sort((a: any, b: any) => b.score - a.score);
  console.log("Top candidates:", JSON.stringify(candidates.slice(0, 15), null, 2));
  console.log("Ready:", candidates.filter((c: any) => c.ready).length);
}

main().catch(console.error);
