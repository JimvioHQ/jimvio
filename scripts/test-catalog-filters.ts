import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  const { getCatalogPage } = await import(
    "../lib/cj/premium-intelligence/catalog-repository"
  );

  const tests: Array<{ name: string; filters: Record<string, boolean> }> = [
    { name: "ready", filters: { autoPublishReady: true } },
    { name: "hasVideo", filters: { hasVideo: true } },
    { name: "pending", filters: { autoPublishPending: true } },
    { name: "reqMissing", filters: { autoPublishRequirementsMissing: true } },
    { name: "missingVideo", filters: { missingVideo: true } },
    { name: "isHidden", filters: { isHidden: true } },
    { name: "trending", filters: { trending: true } },
    { name: "usWarehouse", filters: { usWarehouse: true } },
    { name: "isPublished", filters: { isPublished: true } },
    { name: "isDraft", filters: { isDraft: true } },
  ];

  for (const t of tests) {
    try {
      const r = await getCatalogPage({ page: 1, pageSize: 5, filters: t.filters });
      console.log("OK", t.name, "total", r.total, "rows", r.products.length);
    } catch (e) {
      console.log("FAIL", t.name, (e as Error).message);
    }
  }
}

main().catch(console.error);
