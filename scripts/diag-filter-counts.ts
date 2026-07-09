import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  const { getCatalogDB } = await import("../lib/cj/premium-intelligence/db");
  const { FAILURE_LABELS } = await import(
    "../lib/cj/premium-intelligence/catalog-filter-index"
  );
  const db = getCatalogDB();

  const tests: Array<[string, () => Promise<{ error: { message: string } | null }>]> = [
    ["total", async () => db.from("cj_product_intelligence").select("pid", { count: "exact", head: true })],
    ["missingVariants", async () =>
      db.from("cj_product_intelligence").select("pid", { count: "exact", head: true }).filter("auto_publish_failures", "cs", JSON.stringify(["Missing Variants"]))],
    ["missingStock", async () =>
      db.from("cj_product_intelligence").select("pid", { count: "exact", head: true }).filter("auto_publish_failures", "cs", JSON.stringify(["Out of Stock"]))],
    ["adminOverride", async () =>
      db.from("cj_product_intelligence").select("pid", { count: "exact", head: true }).eq("is_admin_override", true)],
  ];

  for (const [name, fn] of tests) {
    try {
      const { error } = await fn();
      console.log(name, error ? `ERR: ${error.message}` : "OK");
    } catch (e) {
      console.log(name, "THROW", e);
    }
  }
}

main().catch(console.error);
