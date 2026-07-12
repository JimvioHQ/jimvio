import { config } from "dotenv";
config({ path: ".env.local" });
config();

async function main() {
  const { getCatalogDB } = await import("../lib/cj/premium-intelligence/db");
  const { enrichSingleProduct } = await import("../lib/cj/premium-intelligence/enrich-product");
  const { enrichProduct } = await import("../lib/cj/import-intelligence/filters");
  const { rawRowToCJProduct } = await import("../lib/cj/premium-intelligence/map-to-cj-product");
  const { evaluateV3Intelligence } = await import("../lib/cj/premium-intelligence/v3-pipeline");
  const { scoreEnrichedProduct } = await import("../lib/cj/premium-intelligence/score-product");

  const db = getCatalogDB();
  const { data: rawRows } = await db
    .from("cj_raw_products")
    .select("pid, title, raw_payload, sell_price, cost")
    .limit(3000);

  const sorted = (rawRows ?? [])
    .map((r) => ({
      pid: r.pid as string,
      title: r.title as string,
      sell: Number(r.sell_price ?? 0),
      cost: Number(r.cost ?? 0),
      listedNum: Number((r.raw_payload as any)?.listedNum ?? 0),
      isVideo: (r.raw_payload as any)?.isVideo === 1,
    }))
    .filter((r) => r.sell > 0 && r.cost > 0 && r.sell > r.cost && r.listedNum >= 50)
    .sort((a, b) => b.listedNum - a.listedNum)
    .slice(0, 15);

  console.log(`Testing ${sorted.length} products with positive margin...\n`);

  for (const item of sorted) {
    try {
      await enrichSingleProduct(item.pid);
    } catch {
      continue;
    }

    const { data: intel } = await db.from("cj_product_intelligence").select("*").eq("pid", item.pid).maybeSingle();
    const { data: raw } = await db.from("cj_raw_products").select("*").eq("pid", item.pid).maybeSingle();
    if (!intel || !raw) continue;

    const cj = rawRowToCJProduct(raw, intel);
    const enriched = enrichProduct(cj, {});
    enriched.intelligence.enrichmentStatus = "complete";
    enriched.intelligence.trending = intel.trending;
    const scored = scoreEnrichedProduct(enriched, "complete");
    const v3 = evaluateV3Intelligence(enriched);

    if (v3.autoPublish.ready && !v3.blocked && (scored.catalogTier === "ELITE" || scored.catalogTier === "PREMIUM")) {
      console.log("FOUND:", JSON.stringify({
        pid: item.pid,
        title: item.title?.slice(0, 50),
        tier: scored.catalogTier,
        score: v3.autoPublish.score,
        margin: enriched.intelligence.profit.marginPercent,
      }, null, 2));
      return;
    }

    if (v3.autoPublish.ready) {
      console.log("Ready but tier", scored.catalogTier, item.pid.slice(0, 20), "margin", enriched.intelligence.profit.marginPercent);
    }
  }

  console.log("No ideal candidate found");
}

main().catch(console.error);
