import { config } from "dotenv";
config({ path: ".env.local" });
config();

async function main() {
  const { getCatalogDB } = await import("../lib/cj/premium-intelligence/db");
  const db = getCatalogDB();

  const { data: rawRows } = await db
    .from("cj_raw_products")
    .select("pid, title, raw_payload")
    .limit(5000);

  const matches = (rawRows ?? [])
    .map((r) => {
      const p = r.raw_payload as Record<string, unknown>;
      const dc = p?.deliveryCycle ? parseInt(String(p.deliveryCycle), 10) : null;
      return {
        pid: r.pid,
        title: (r.title as string)?.slice(0, 50),
        listedNum: Number(p?.listedNum ?? 0),
        deliveryCycle: dc,
        isVideo: p?.isVideo === 1,
        verifiedWarehouse: p?.verifiedWarehouse === 1,
        variantCount: Number(p?.variantCount ?? 0),
        stock: Number(p?.warehouseInventoryNum ?? 0),
      };
    })
    .filter((r) => r.deliveryCycle !== null && r.deliveryCycle <= 7 && r.listedNum >= 50)
    .sort((a, b) => b.listedNum - a.listedNum)
    .slice(0, 20);

  console.log("Fast shipping + 50 orders:", matches.length);
  console.log(JSON.stringify(matches, null, 2));

  const videoMatches = matches.filter(m => m.isVideo);
  console.log("\nWith video:", videoMatches.length);
}

main().catch(console.error);
