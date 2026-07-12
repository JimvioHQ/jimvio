import { config } from "dotenv";
config({ path: ".env.local" });
config();

async function main() {
  const pid = "1460476587618209792";
  const { getServiceClient, getCJToken, cjFetch } = await import("../lib/cj/client");
  const { enrichSingleProduct } = await import("../lib/cj/premium-intelligence/enrich-product");
  const { getCatalogDB } = await import("../lib/cj/premium-intelligence/db");
  const { enrichProduct } = await import("../lib/cj/import-intelligence/filters");
  const { rawRowToCJProduct } = await import("../lib/cj/premium-intelligence/map-to-cj-product");
  const { evaluateV3Intelligence } = await import("../lib/cj/premium-intelligence/v3-pipeline");

  const supabase = getServiceClient();
  const token = await getCJToken(supabase);

  const detailRes = await cjFetch<{ data: Record<string, unknown> }>(
    `/product/query?pid=${encodeURIComponent(pid)}&features=enable_video,enable_inventory`,
    token
  );

  console.log("CJ Detail keys:", Object.keys(detailRes.data ?? {}));
  console.log("deliveryCycle:", detailRes.data?.deliveryCycle);
  console.log("verifiedWarehouse:", detailRes.data?.verifiedWarehouse);
  console.log("listedNum:", detailRes.data?.listedNum);
  console.log("isVideo:", detailRes.data?.isVideo);
  console.log("warehouseInventoryNum:", detailRes.data?.warehouseInventoryNum);

  await enrichSingleProduct(pid);

  const db = getCatalogDB();
  const { data: intel } = await db.from("cj_product_intelligence").select("*").eq("pid", pid).single();
  const { data: raw } = await db.from("cj_raw_products").select("*").eq("pid", pid).single();

  const cj = rawRowToCJProduct(raw, intel);
  const enriched = enrichProduct(cj, {});
  enriched.intelligence.enrichmentStatus = intel?.enrichment_status;
  enriched.intelligence.trending = intel?.trending;

  const v3 = evaluateV3Intelligence(enriched);
  console.log("\nIntel:", {
    delivery_days: intel?.delivery_days,
    has_video: intel?.has_video,
    supplier_verified: intel?.supplier_verified,
    image_count: intel?.image_count,
    description_length: intel?.description_length,
  });
  console.log("\nEvaluation:", {
    ready: v3.autoPublish.ready,
    score: v3.autoPublish.score,
    failures: v3.autoPublish.failures,
    checks: v3.autoPublish.checks.map(c => ({ k: c.key, ok: c.passed })),
  });
}

main().catch(console.error);
