import type { SupabaseClient } from "@supabase/supabase-js";
import { cosTable } from "../db";

export type OrderPipelineCounts = {
  pendingPayment: number;
  paid: number;
  processing: number;
  shipped: number;
  delivered: number;
  refunded: number;
  cancelled: number;
  fulfillmentException: number;
};

export type FulfillmentHealthCounts = {
  cjOrders: number;
  processing: number;
  shipped: number;
  trackingAvailable: number;
  fulfillmentExceptions: number;
};

function isPaidStatus(status: string | null | undefined) {
  const s = (status || "").toLowerCase();
  return s === "paid" || s === "completed";
}

export async function getStoreAnalytics(
  db: SupabaseClient,
  storeId: string,
  vendorId: string,
  days = 30
) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data: orders } = await db
    .from("orders")
    .select(
      "id, total_amount, payment_status, status, created_at, cj_order_id, tracking_number"
    )
    .eq("jimvio_store_id", storeId)
    .gte("created_at", since);

  const list = orders ?? [];
  const paid = list.filter((o) => isPaidStatus(o.payment_status));
  const revenue = paid.reduce((s, o) => s + Number(o.total_amount || 0), 0);

  const pipeline: OrderPipelineCounts = {
    pendingPayment: 0,
    paid: 0,
    processing: 0,
    shipped: 0,
    delivered: 0,
    refunded: 0,
    cancelled: 0,
    fulfillmentException: 0,
  };

  const fulfillment: FulfillmentHealthCounts = {
    cjOrders: 0,
    processing: 0,
    shipped: 0,
    trackingAvailable: 0,
    fulfillmentExceptions: 0,
  };

  for (const o of list) {
    const pay = (o.payment_status || "").toLowerCase();
    const st = (o.status || "").toLowerCase();

    if (pay === "refunded" || st === "refunded") pipeline.refunded += 1;
    else if (st === "cancelled" || pay === "cancelled") pipeline.cancelled += 1;
    else if (!isPaidStatus(pay)) pipeline.pendingPayment += 1;
    else if (st === "delivered") pipeline.delivered += 1;
    else if (st === "shipped") pipeline.shipped += 1;
    else if (st === "fulfillment_exception") pipeline.fulfillmentException += 1;
    else if (st === "processing" || st === "confirmed") pipeline.processing += 1;
    else pipeline.paid += 1;

    if (o.cj_order_id) fulfillment.cjOrders += 1;
    if (o.tracking_number) fulfillment.trackingAvailable += 1;
    if (st === "processing" || st === "confirmed") fulfillment.processing += 1;
    if (st === "shipped") fulfillment.shipped += 1;
    if (st === "fulfillment_exception") fulfillment.fulfillmentExceptions += 1;
  }

  const pendingFulfillment = list.filter((o) => {
    if (!isPaidStatus(o.payment_status)) return false;
    const st = (o.status || "").toLowerCase();
    return st === "confirmed" || st === "processing" || st === "paid";
  }).length;

  const { count: productCount } = await cosTable(db, "jimvio_store_products")
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
    pendingFulfillment,
    pipeline,
    fulfillment,
    // Traffic / conversion not fabricated
    visitors: null as number | null,
    conversionRate: null as number | null,
  };
}
