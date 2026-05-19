import React from "react";
import { createClient } from "@/lib/supabase/server";
import { getAdminOverviewStats, getAdminRevenueChartData } from "@/services/db";
import { AdminOverviewClient } from "@/components/admin/admin-overview-client";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const supabase = await createClient();

  const [dbStats, rawChartData, verificationsRes, disputesRes, payoutsRes, ugcRes, recentOrdersRes, newUsersRes, prevRevenueRes] =
    await Promise.all([
      getAdminOverviewStats(),
      getAdminRevenueChartData(),

      // Pending vendor verifications
      supabase
        .from("vendors")
        .select("id, business_name, business_country, created_at")
        .eq("verification_status", "pending")
        .order("created_at", { ascending: false })
        .limit(10),

      // Open disputes (orders with disputed status — adapt to your dispute table if different)
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("status", "cancelled")       // replace with actual dispute logic if you have a disputes table
        .gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString()),

      // Pending payouts
      supabase
        .from("payouts")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),

      // Active UGC campaigns
      supabase
        .from("ugc_campaigns")
        .select("id", { count: "exact", head: true })
        .eq("status", "active"),

      // Recent orders with buyer name via join
      supabase
        .from("orders")
        .select("id, order_number, total_amount, status, created_at, profiles!buyer_id(full_name, email)")
        .order("created_at", { ascending: false })
        .limit(8),

      // New users this month
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .gte("created_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),

      // Previous month revenue estimate via transactions
      supabase
        .from("transactions")
        .select("amount")
        .eq("direction", "credit")
        .eq("status", "completed")
        .gte(
          "created_at",
          new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString()
        )
        .lt(
          "created_at",
          new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
        ),
    ]);

  // Compute prev month revenue
  const prevMonthRevenue = (prevRevenueRes.data ?? []).reduce(
    (sum: number, tx: { amount: number }) => sum + (tx.amount ?? 0),
    0
  );

  const stats = {
    ...dbStats,
    monthlyRevenue: dbStats.totalRevenue / 12,         // fallback; override with real 30d query in getAdminOverviewStats
    pendingVerifications: verificationsRes.data?.length ?? 0,
    pendingDisputes: disputesRes.count ?? 0,
    pendingPayouts: payoutsRes.count ?? 0,
    activeUgcCampaigns: ugcRes.count ?? 0,
    newUsersThisMonth: newUsersRes.count ?? 0,
    prevMonthRevenue,
  };

  const chartData = rawChartData.map((d: any) => ({
    month: d.name,
    revenue: d.revenue,
  }));

  // Shape recent orders
  const recentOrders = (recentOrdersRes.data ?? []).map((o: any) => ({
    id: o.id,
    order_number: o.order_number,
    buyer_name: o.profiles?.full_name || o.profiles?.email || "Unknown buyer",
    total_amount: o.total_amount,
    status: o.status ?? "pending",
    created_at: o.created_at,
  }));

  const pendingVendors = verificationsRes.data ?? [];

  return (
    <AdminOverviewClient
      stats={stats}
      chartData={chartData}
      recentOrders={recentOrders}
      pendingVendors={pendingVendors}
    />
  );
}