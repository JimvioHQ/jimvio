import React from "react";
import { getAdminDashboardData } from "@/services/admin/getAdminDashboard";
import { AdminOverviewClient } from "@/components/admin/admin-overview-client";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
    const data = await getAdminDashboardData();
    return <AdminOverviewClient data={data} />;
}
