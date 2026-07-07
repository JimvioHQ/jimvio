import { config } from "dotenv";
config({ path: ".env.local" });
config();

async function main() {
  const { getCatalogDB } = await import("../lib/cj/premium-intelligence/db");
  const { createAdminClient } = await import("../lib/supabase/admin");
  const db = getCatalogDB();
  const admin = createAdminClient();

  const { data: maps } = await db.from("cj_product_map").select("cj_pid, product_id");

  for (const m of maps ?? []) {
    const pid = m.cj_pid as string;
    const productId = m.product_id as string;

    const { data: prod } = await admin
      .from("products")
      .select("status, name")
      .eq("id", productId)
      .maybeSingle();

    const { data: intel } = await db
      .from("cj_product_intelligence")
      .select("catalog_tier, auto_publish_ready, auto_publish_score")
      .eq("pid", pid)
      .maybeSingle();

    const { data: raw } = await db.from("cj_raw_products").select("pid").eq("pid", pid).maybeSingle();

    if (prod?.status === "active" && raw && intel) {
      console.log({
        pid,
        productId,
        name: prod.name?.slice(0, 40),
        tier: intel.catalog_tier,
        ready: intel.auto_publish_ready,
        score: intel.auto_publish_score,
      });
    }
  }
}

main().catch(console.error);
