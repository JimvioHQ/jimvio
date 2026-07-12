import { config } from "dotenv";
config({ path: ".env.local" });
config();

async function main() {
  const { getCatalogDB } = await import("../lib/cj/premium-intelligence/db");
  const db = getCatalogDB();

  const { data: rawRows } = await db
    .from("cj_raw_products")
    .select("pid, title, raw_payload")
    .limit(22941);

  const withDelivery = (rawRows ?? [])
    .map((r) => {
      const p = r.raw_payload as Record<string, unknown>;
      const dc = p?.deliveryCycle ? String(p.deliveryCycle) : null;
      return {
        pid: r.pid,
        title: (r.title as string)?.slice(0, 40),
        deliveryCycle: dc,
        listedNum: Number(p?.listedNum ?? 0),
        isVideo: p?.isVideo === 1,
      };
    })
    .filter((r) => r.deliveryCycle !== null);

  console.log("Products with deliveryCycle in list:", withDelivery.length);
  console.log(JSON.stringify(withDelivery.slice(0, 15), null, 2));

  const fast = withDelivery.filter((r) => parseInt(r.deliveryCycle!, 10) <= 7);
  console.log("\nFast shipping (list data):", fast.length);
  console.log(JSON.stringify(fast.slice(0, 10), null, 2));
}

main().catch(console.error);
