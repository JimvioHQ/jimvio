import { config } from "dotenv";
config({ path: ".env.local" });
config();

async function main() {
  const { getCatalogDB } = await import("../lib/cj/premium-intelligence/db");
  const { enrichSingleProduct } = await import("../lib/cj/premium-intelligence/enrich-product");
  const { enrichProduct } = await import("../lib/cj/import-intelligence/filters");
  const { rawRowToCJProduct } = await import("../lib/cj/premium-intelligence/map-to-cj-product");
  const { evaluateV3Intelligence, toV3DbPayload } = await import("../lib/cj/premium-intelligence/v3-pipeline");
  const { updateIntelligence } = await import("../lib/cj/premium-intelligence/catalog-repository");

  const db = getCatalogDB();

  const { data: rawRows } = await db
    .from("cj_raw_products")
    .select("pid, title, raw_payload")
    .limit(2000);

  const candidates = (rawRows ?? [])
    .map((r) => {
      const payload = r.raw_payload as Record<string, unknown>;
      const listedNum = Number(payload?.listedNum ?? 0);
      const deliveryCycle = payload?.deliveryCycle ? parseInt(String(payload.deliveryCycle), 10) : null;
      const isVideo = payload?.isVideo === 1;
      const verifiedWarehouse = payload?.verifiedWarehouse === 1;
      return {
        pid: r.pid as string,
        title: r.title as string,
        listedNum,
        deliveryCycle,
        isVideo,
        verifiedWarehouse,
      };
    })
    .filter((r) => r.listedNum >= 50 && r.isVideo)
    .sort((a, b) => b.listedNum - a.listedNum)
    .slice(0, 50);

  console.log(`Scanning ${candidates.length} video products with 50+ orders...\n`);

  for (const item of candidates) {
    await enrichSingleProduct(item.pid);

    const { data: intel } = await db.from("cj_product_intelligence").select("*").eq("pid", item.pid).maybeSingle();
    const { data: raw } = await db.from("cj_raw_products").select("*").eq("pid", item.pid).maybeSingle();
    if (!raw || !intel) continue;

    const cj = rawRowToCJProduct(raw, intel);
    const enriched = enrichProduct(cj, {});
    enriched.intelligence.enrichmentStatus = intel.enrichment_status;
    enriched.intelligence.trending = intel.trending;

    const v3 = evaluateV3Intelligence(enriched);
    await updateIntelligence(item.pid, toV3DbPayload(v3));

    if (v3.autoPublish.ready && !v3.blocked) {
      console.log("READY:", JSON.stringify({
        pid: item.pid,
        title: item.title?.slice(0, 60),
        score: v3.autoPublish.score,
        delivery_days: intel.delivery_days,
        failures: v3.autoPublish.failures,
      }, null, 2));
      return;
    }

    if (v3.autoPublish.score >= 100) {
      console.log("Score 100 but blocked?", item.pid, v3.blockReasons);
    } else if (v3.autoPublish.score >= 87.5) {
      console.log("Near:", item.pid, v3.autoPublish.score, v3.autoPublish.failures, "delivery:", intel.delivery_days);
    }
  }

  console.log("\nNo ready product found");
}

main().catch(console.error);
