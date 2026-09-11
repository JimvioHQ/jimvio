import type { SupabaseClient } from "@supabase/supabase-js";

export async function getStoreAnalytics(
  db: SupabaseClient,
  storeId: string,
  vendorId: string,
  days = 30
) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data: orders } = await db
    .from("orders")
    .select("id, total_amount, payment_status, created_at")
    .eq("jimvio_store_id", storeId)
    .eq("vendor_id", vendorId)
    .gte("created_at", since);

  const list = orders ?? [];
  const paid = list.filter((o) => o.payment_status === "paid" || o.payment_status === "completed");
  const revenue = paid.reduce((s, o) => s + Number(o.total_amount || 0), 0);

  const { count: productCount } = await db
    .from("jimvio_store_products")
    .select("id", { count: "exact", head: true })
    .eq("store_id", storeId)
    .eq("status", "published");

  return {
    orders: list.length,
    paidOrders: paid.length,
    revenue: Math.round(revenue * 100) / 100,
    averageOrderValue:
      paid.length > 0 ? Math.round((revenue / paid.length) * 100) / 100 : 0,
    productsPublished: productCount ?? 0,
    // Traffic / conversion not fabricated
    visitors: null as number | null,
    conversionRate: null as number | null,
  };
}
