import { config } from "dotenv";
config({ path: ".env.local" });

const TIMEOUT_MS = 30_000;

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
    { name: "missingImages", filters: { missingImages: true } },
    { name: "missingDescription", filters: { missingDescription: true } },
    { name: "isDraft", filters: { isDraft: true } },
    { name: "isHidden", filters: { isHidden: true } },
    { name: "trending", filters: { trending: true } },
    { name: "usWarehouse", filters: { usWarehouse: true } },
    { name: "isPublished", filters: { isPublished: true } },
  ];

  const failures: string[] = [];

  for (const t of tests) {
    const start = Date.now();
    try {
      const r = await Promise.race([
        getCatalogPage({ page: 1, pageSize: 5, filters: t.filters }),
        new Promise<never>((_, rej) =>
          setTimeout(() => rej(new Error("statement timeout")), TIMEOUT_MS)
        ),
      ]);
      console.log(
        "OK",
        t.name,
        "total",
        r.total,
        "rows",
        r.products.length,
        `(${Date.now() - start}ms)`
      );
    } catch (e) {
      const msg = (e as Error).message;
      console.log("FAIL", t.name, msg, `(${Date.now() - start}ms)`);
      failures.push(t.name);
    }
  }

  if (failures.length > 0) {
    console.log(`\nFAILED (${failures.length}):`, failures.join(", "));
    process.exit(1);
  }

  console.log("\nALL FILTER TESTS PASSED");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
