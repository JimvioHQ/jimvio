import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Seller marketplace analytics — sales, views, orders, conversion. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: vendor } = await supabase
    .from("vendors")
    .select("id, business_name, total_sales, total_revenue, rating")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!vendor) return NextResponse.json({ error: "Not a vendor" }, { status: 403 });

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: products } = await supabase
    .from("products")
    .select("id, name, slug, view_count, sale_count, rating, review_count, status, is_active")
    .eq("vendor_id", vendor.id)
    .is("deleted_at", null)
    .order("view_count", { ascending: false })
    .limit(20);

  const productIds = (products ?? []).map((p) => p.id);

  const [{ count: orderCount }, { data: orderRows }, viewsRes] = await Promise.all([
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("vendor_id", vendor.id)
      .gte("created_at", since),
    supabase
      .from("orders")
      .select("total_amount, payment_status, created_at")
      .eq("vendor_id", vendor.id)
      .in("payment_status", ["paid", "completed"])
      .gte("created_at", since),
    productIds.length > 0
      ? supabase
          .from("product_views")
          .select("id", { count: "exact", head: true })
          .in("product_id", productIds)
          .gte("created_at", since)
      : Promise.resolve({ count: 0 }),
  ]);

  const revenue30d = (orderRows ?? []).reduce(
    (sum, o) => sum + Number(o.total_amount ?? 0),
    0
  );
  const views =
    viewsRes.count ??
    (products ?? []).reduce((sum, p) => sum + Number(p.view_count ?? 0), 0);
  const orders = orderCount ?? 0;
  const conversion = views > 0 ? Number(((orders / views) * 100).toFixed(2)) : 0;

  return NextResponse.json({
    vendor: {
      id: vendor.id,
      name: vendor.business_name,
      lifetimeSales: vendor.total_sales ?? 0,
      lifetimeRevenue: vendor.total_revenue ?? 0,
      rating: vendor.rating,
    },
    kpis: {
      revenue30d,
      orders30d: orders,
      views30d: views,
      conversionRate: conversion,
      activeListings: (products ?? []).filter((p) => p.status === "active" && p.is_active).length,
    },
    topProducts: products ?? [],
  });
}
