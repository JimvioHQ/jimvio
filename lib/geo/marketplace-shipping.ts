import type { ShippingRankRow } from "@/lib/geo/marketplace-rank";

type ShippingClient = {
  from: (table: "product_shipping_options") => {
    select: (columns: string) => {
      in: (column: "product_id", values: string[]) => {
        eq: (
          column: "is_active",
          value: boolean,
        ) => PromiseLike<{ data: ShippingRankRow[] | null; error: { message: string } | null }>;
      };
    };
  };
};

/** One indexed read for the current page. Failure leaves ranking neutral. */
export async function fetchActiveShippingForProducts(
  db: unknown,
  productIds: string[],
): Promise<ShippingRankRow[]> {
  if (!productIds.length) return [];
  const client = db as ShippingClient;
  const { data, error } = await client
    .from("product_shipping_options")
    .select("product_id, ship_to_country, min_delivery_days, is_active")
    .in("product_id", productIds)
    .eq("is_active", true);
  if (error) return [];
  return data ?? [];
}
