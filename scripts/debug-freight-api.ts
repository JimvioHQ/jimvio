import { config } from "dotenv";
config({ path: ".env.local" });
config();

async function main() {
  const pid = "1460476587618209792";
  const { getServiceClient, getCJToken, cjFetch } = await import("../lib/cj/client");
  const supabase = getServiceClient();
  const token = await getCJToken(supabase);

  const detailRes = await cjFetch<{ data: Record<string, unknown> }>(
    `/product/query?pid=${encodeURIComponent(pid)}&features=enable_video,enable_inventory`,
    token
  );
  const detail = detailRes.data;
  const variants = detail?.variants as unknown[];
  console.log("Variants count:", variants?.length);
  console.log("First variant:", JSON.stringify(variants?.[0], null, 2));

  const vid = (variants?.[0] as any)?.vid;
  console.log("vid:", vid);

  if (vid) {
    const res = await fetch("https://developers.cjdropshipping.com/api2.0/v1/logistic/freightCalculate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "CJ-Access-Token": token,
      },
      body: JSON.stringify({
        startCountryCode: "CN",
        endCountryCode: "US",
        products: [{ vid, quantity: 1, weight: 110 }],
        weight: 110,
      }),
    });
    const data = await res.json();
    console.log("Freight response:", JSON.stringify(data, null, 2).slice(0, 2000));
  }
}

main().catch(console.error);
