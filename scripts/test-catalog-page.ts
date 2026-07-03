import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  const { getCatalogPage, getTierCounts } = await import(
    "../lib/cj/premium-intelligence/catalog-repository"
  );

  const tiers = await getTierCounts();
  console.log("tierCounts", tiers);

  const page = await getCatalogPage({
    page: 1,
    pageSize: 5,
    sort: "health",
  });
  console.log("page total", page.total);
  console.log(
    "sample tiers",
    page.products.slice(0, 3).map((p) => ({
      pid: p.pid,
      tier: p.intelligence?.catalog_tier,
      status: p.intelligence?.enrichment_status,
    }))
  );
}

main().catch(console.error);
