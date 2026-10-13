/**
 * One destination-aware freight quote for a published CJ variant.
 * Does not place an order. Caps destinations.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config();

async function main() {
  const destinations = (process.env.DESTINATIONS ?? "RW,US").split(",").map((code) => code.trim()).slice(0, 3);
  const { getServiceClient } = await import("../lib/cj/client");
  const { fetchCjCheckoutFreightRates } = await import("../lib/cj/checkout-shipping");
  const db = getServiceClient();
  const { data: variant, error } = await db
    .from("product_variants")
    .select("cj_vid, product_id, products!inner(id, name, source, status, is_active)")
    .eq("products.source", "cj")
    .eq("products.status", "active")
    .eq("products.is_active", true)
    .not("cj_vid", "is", null)
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const vid = variant?.cj_vid;
  if (!vid) {
    console.log(JSON.stringify({ ok: false, reason: "no_published_variant" }));
    return;
  }
  const quotes = [];
  for (const countryCode of destinations) {
    try {
      const rates = await fetchCjCheckoutFreightRates({
        destCountryCode: countryCode,
        products: [{ vid: String(vid), quantity: 1 }],
      });
      quotes.push({
        countryCode,
        unavailable: rates.unavailable === true,
        options: (rates.rates ?? []).slice(0, 3).map((rate) => ({
          name: rate.name,
          priceUSD: rate.priceUSD,
          arrivalDays: rate.arrivalDays,
        })),
      });
    } catch (err) {
      quotes.push({
        countryCode,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  const product = Array.isArray(variant.products) ? variant.products[0] : variant.products;
  console.log(JSON.stringify({
    productId: variant.product_id,
    productName: product && "name" in product ? product.name : null,
    quotes,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
