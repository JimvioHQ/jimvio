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
    .limit(500);

  const sorted = (rawRows ?? [])
    .map((r) => ({
      pid: r.pid as string,
      title: r.title as string,
      listedNum: Number((r.raw_payload as any)?.listedNum ?? 0),
    }))
    .filter((r) => r.listedNum >= 50)
    .sort((a, b) => b.listedNum - a.listedNum)
    .slice(0, 30);

  console.log(`Testing ${sorted.length} high-order products...\n`);

  for (const item of sorted) {
    try {
      await enrichSingleProduct(item.pid);
    } catch {
      continue;
    }

    const { data: intel } = await db
      .from("cj_product_intelligence")
      .select("*")
      .eq("pid", item.pid)
      .maybeSingle();
    const { data: raw } = await db
      .from("cj_raw_products")
      .select("*")
      .eq("pid", item.pid)
      .maybeSingle();
    if (!raw || !intel) continue;

    const cj = rawRowToCJProduct(raw, intel);
    const enriched = enrichProduct(cj, {});
    enriched.intelligence.enrichmentStatus = intel.enrichment_status;
    enriched.intelligence.trending = intel.trending;

    const v3 = evaluateV3Intelligence(enriched);
    await updateIntelligence(item.pid, toV3DbPayload(v3));

    if (v3.autoPublish.ready && !v3.blocked) {
      console.log("FOUND READY:", JSON.stringify({
        pid: item.pid,
        title: item.title?.slice(0, 60),
        score: v3.autoPublish.score,
        listedNum: item.listedNum,
        checks: v3.autoPublish.checks.map(c => ({ k: c.key, ok: c.passed })),
      }, null, 2));
      return;
    }

    if (v3.autoPublish.score >= 87.5) {
      console.log("Near miss:", item.pid, v3.autoPublish.score, v3.autoPublish.failures);
    }
  }

  console.log("No ready product found in batch");
}

main().catch(console.error);
