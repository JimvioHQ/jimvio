import { config } from "dotenv";
config({ path: ".env.local" });
config();

async function main() {
  const pid = process.argv[2] ?? "2607030855271621400";
  const { getCatalogDB } = await import("../lib/cj/premium-intelligence/db");
  const { enrichProduct } = await import("../lib/cj/import-intelligence/filters");
  const { rawRowToCJProduct } = await import("../lib/cj/premium-intelligence/map-to-cj-product");
  const { evaluateV3Intelligence } = await import("../lib/cj/premium-intelligence/v3-pipeline");
  const { enrichSingleProduct } = await import("../lib/cj/premium-intelligence/enrich-product");

  const db = getCatalogDB();

  console.log("Enriching", pid);
  await enrichSingleProduct(pid);

  const { data: intel } = await db.from("cj_product_intelligence").select("*").eq("pid", pid).single();
  const { data: raw } = await db.from("cj_raw_products").select("*").eq("pid", pid).single();
  const { data: mapped } = await db.from("cj_product_map").select("product_id").eq("cj_pid", pid).maybeSingle();

  const cj = rawRowToCJProduct(raw, intel);
  const productId = mapped?.product_id as string | undefined;
  const enriched = enrichProduct(cj, productId ? { [pid]: { productId } } : {});
  if (intel) {
    enriched.intelligence.enrichmentStatus = intel.enrichment_status;
    enriched.intelligence.trending = intel.trending;
  }

  const v3 = evaluateV3Intelligence(enriched);

  console.log(JSON.stringify({
    pid,
    productId,
    enrichment_status: intel?.enrichment_status,
    auto_publish_ready: intel?.auto_publish_ready,
    auto_publish_score: intel?.auto_publish_score,
    auto_publish_status: intel?.auto_publish_status,
    auto_publish_failures: intel?.auto_publish_failures,
    catalog_tier: intel?.catalog_tier,
    has_video: intel?.has_video,
    v3_ready: v3.autoPublish.ready,
    v3_blocked: v3.blocked,
    v3_failures: v3.autoPublish.failures,
    v3_blockReasons: v3.blockReasons,
    checks: v3.autoPublish.checks.map(c => ({ key: c.key, passed: c.passed, tooltip: c.tooltip })),
  }, null, 2));
}

main().catch(console.error);
