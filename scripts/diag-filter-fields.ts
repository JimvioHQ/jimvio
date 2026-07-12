import { config } from "dotenv";
config({ path: ".env.local" });
config();

async function main() {
  const { getCatalogDB } = await import("../lib/cj/premium-intelligence/db");
  const db = getCatalogDB();

  const counts = await Promise.all([
    db.from("cj_product_intelligence").select("pid", { count: "exact", head: true }).eq("has_video", true),
    db.from("cj_product_intelligence").select("pid", { count: "exact", head: true }).eq("supplier_verified", true),
    db.from("cj_product_intelligence").select("pid", { count: "exact", head: true }).eq("trending", true),
    db.from("cj_product_intelligence").select("pid", { count: "exact", head: true }).eq("enrichment_status", "complete"),
  ]);

  console.log("has_video:", counts[0].count, counts[0].error?.message);
  console.log("supplier_verified:", counts[1].count, counts[1].error?.message);
  console.log("trending:", counts[2].count, counts[2].error?.message);
  console.log("enriched:", counts[3].count, counts[3].error?.message);

  const { data: samples } = await db
    .from("cj_raw_products")
    .select("pid, warehouse, supplier, raw_payload")
    .limit(20);

  let verifiedFlags = 0;
  let videoFlags = 0;
  for (const row of samples ?? []) {
    const p = (row.raw_payload ?? {}) as Record<string, unknown>;
    if (Number(p.isVideo ?? 0) === 1) videoFlags++;
    if (
      p.supplierVerified === true ||
      Number(p.verifiedSupplier ?? 0) === 1 ||
      Number(p.addMarkStatus ?? 0) === 1
    ) {
      verifiedFlags++;
    }
  }
  console.log("raw sample video flags:", videoFlags, "/ 20");
  console.log("raw sample verified flags:", verifiedFlags, "/ 20");

  const { data: intelSample } = await db
    .from("cj_product_intelligence")
    .select("pid, has_video, supplier_verified, trending, enrichment_status")
    .eq("has_video", true)
    .limit(5);
  console.log("has_video sample:", intelSample);

  try {
    const { computeCatalogFilterCounts } = await import(
      "../lib/cj/premium-intelligence/catalog-filter-index"
    );
    const { invalidateCatalogCache } = await import(
      "../lib/cj/premium-intelligence/catalog-cache"
    );
    invalidateCatalogCache();
    const fc = await computeCatalogFilterCounts();
    console.log("filter counts ok:", {
      hasVideo: fc.hasVideo,
      verifiedSupplier: fc.verifiedSupplier,
      trending: fc.trending,
    });
  } catch (e) {
    console.error("computeCatalogFilterCounts failed:", e);
  }
}

main().catch(console.error);
