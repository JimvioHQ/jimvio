import type { SupabaseClient } from "@supabase/supabase-js";

export type ShippingQuote = {
  rateId: string;
  name: string;
  price: number;
  currency: string;
  source: "store" | "supplier";
};

/**
 * Resolve store shipping rates for a destination country.
 * Supplier/CJ real-time rates remain available via existing checkout shipping for CJ lines.
 */
export async function getStoreShippingQuotes(
  db: SupabaseClient,
  storeId: string,
  countryCode: string,
  subtotal: number
): Promise<ShippingQuote[]> {
  const country = countryCode.toUpperCase();
  const { data: zones } = await db
    .from("jimvio_shipping_zones")
    .select("id, name, countries")
    .eq("store_id", storeId);

  const matched = (zones ?? []).filter((z) => {
    const countries = (z.countries as string[]) || [];
    return countries.length === 0 || countries.map((c) => c.toUpperCase()).includes(country);
  });

  if (!matched.length) return [];

  const zoneIds = matched.map((z) => z.id);
  const { data: rates } = await db
    .from("jimvio_shipping_rates")
    .select("*")
    .in("zone_id", zoneIds);

  const quotes: ShippingQuote[] = [];
  for (const rate of rates ?? []) {
    if (rate.min_order_amount != null && subtotal < Number(rate.min_order_amount)) continue;
    if (rate.max_order_amount != null && subtotal > Number(rate.max_order_amount)) continue;

    let price = Number(rate.price) || 0;
    if (rate.rate_type === "free") price = 0;

    quotes.push({
      rateId: rate.id,
      name: rate.name,
      price,
      currency: rate.currency || "USD",
      source: rate.rate_type === "supplier" ? "supplier" : "store",
    });
  }

  return quotes.sort((a, b) => a.price - b.price);
}
