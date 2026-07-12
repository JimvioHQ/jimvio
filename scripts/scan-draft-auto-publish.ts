import { config } from "dotenv";
config({ path: ".env.local" });
config();

async function main() {
  const { getCatalogDB } = await import("../lib/cj/premium-intelligence/db");
  const { enrichProduct } = await import("../lib/cj/import-intelligence/filters");
  const { rawRowToCJProduct } = await import("../lib/cj/premium-intelligence/map-to-cj-product");
  const { evaluateV3Intelligence } = await import("../lib/cj/premium-intelligence/v3-pipeline");
  const { enrichSingleProduct } = await import("../lib/cj/premium-intelligence/enrich-product");

  const db = getCatalogDB();

  const { data: maps } = await db.from("cj_product_map").select("cj_pid, product_id").limit(92);

  const results: unknown[] = [];

  for (const m of maps ?? []) {
    const pid = m.cj_pid as string;
    const productId = m.product_id as string;

    const { data: prod } = await db
      .from("products")
      .select("status, is_active, name, published_by_admin_override")
      .eq("id", productId)
      .maybeSingle();

    if (prod?.status !== "draft" || prod?.published_by_admin_override) continue;

    const { data: raw } = await db.from("cj_raw_products").select("pid").eq("pid", pid).maybeSingle();
    if (!raw) continue;

    await enrichSingleProduct(pid);

    const { data: intel } = await db.from("cj_product_intelligence").select("*").eq("pid", pid).single();
    const { data: rawFull } = await db.from("cj_raw_products").select("*").eq("pid", pid).single();
    const cj = rawRowToCJProduct(rawFull, intel);
    const enriched = enrichProduct(cj, { [pid]: { productId } });
    if (intel) {
      enriched.intelligence.enrichmentStatus = intel.enrichment_status;
      enriched.intelligence.trending = intel.trending;
    }
    const v3 = evaluateV3Intelligence(enriched);

    results.push({
      pid,
      productId,
      name: prod.name?.slice(0, 50),
      ready: v3.autoPublish.ready && !v3.blocked,
      score: v3.autoPublish.score,
      failures: [...v3.autoPublish.failures, ...v3.blockReasons],
      checks: v3.autoPublish.checks.filter(c => !c.passed).map(c => c.label),
    });
  }

  results.sort((a: any, b: any) => b.score - a.score);
  console.log(JSON.stringify(results, null, 2));
  console.log("\nReady count:", results.filter((r: any) => r.ready).length);
}

main().catch(console.error);
