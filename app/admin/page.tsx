import React from "react";
import { getAdminOverviewStats, getAdminRevenueChartData } from "@/services/db";
import { AdminOverviewClient } from "@/components/admin/admin-overview-client";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const [stats, chartData] = await Promise.all([getAdminOverviewStats(), getAdminRevenueChartData()]);
  return <AdminOverviewClient stats={stats} chartData={chartData} />;
}
