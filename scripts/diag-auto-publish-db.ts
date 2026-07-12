import { config } from "dotenv";
config({ path: ".env.local" });
config();

async function main() {
  const { getCatalogDB } = await import("../lib/cj/premium-intelligence/db");
  const db = getCatalogDB();

  const { count: intelCount } = await db
    .from("cj_product_intelligence")
    .select("*", { count: "exact", head: true });

  const { count: rawCount } = await db
    .from("cj_raw_products")
    .select("*", { count: "exact", head: true });

  const { count: mapCount } = await db
    .from("cj_product_map")
    .select("*", { count: "exact", head: true });

  const { data: cjProducts } = await db
    .from("products")
    .select("id, status, is_active, name, source_metadata")
    .eq("source", "cj")
    .limit(10);

  const { data: readyIntel } = await db
    .from("cj_product_intelligence")
    .select("pid, auto_publish_ready, auto_publish_status, enrichment_status, auto_publish_score")
    .eq("auto_publish_ready", true)
    .limit(10);

  const { data: topScore } = await db
    .from("cj_product_intelligence")
    .select("pid, auto_publish_ready, auto_publish_status, enrichment_status, auto_publish_score")
    .order("auto_publish_score", { ascending: false })
    .limit(10);

  console.log(JSON.stringify({
    intelCount,
    rawCount,
    mapCount,
    cjProducts: cjProducts?.map(p => ({
      id: p.id,
      status: p.status,
      is_active: p.is_active,
      name: p.name?.slice(0, 40),
      cj_pid: (p.source_metadata as any)?.cj_pid,
    })),
    readyIntel,
    topScore,
  }, null, 2));
}

main().catch(console.error);
