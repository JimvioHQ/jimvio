import React from "react";
import { getAdminOverviewStats, getAdminRevenueChartData } from "@/services/db";
import { AdminOverviewClient } from "@/components/admin/admin-overview-client";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const [dbStats, rawChartData] = await Promise.all([getAdminOverviewStats(), getAdminRevenueChartData()]);
  
  const stats = {
    ...dbStats,
    monthlyRevenue: dbStats.totalRevenue / 12, // Dummy approximation
    pendingVerifications: 0,
  };

  const chartData = rawChartData.map((d: any) => ({
    month: d.name,
    revenue: d.revenue,
  }));

  return <AdminOverviewClient stats={stats} chartData={chartData} />;
}

