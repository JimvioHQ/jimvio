import Link from "next/link";
import { BarChart3, Users, Store, ShoppingBag, AlertTriangle } from "lucide-react";
import { getAdminReports } from "@/services/admin/getAdminReports";
import { resolveAdminRange } from "@/lib/admin/ranges";
import { AdminReportsClient } from "@/components/admin/admin-reports-client";
import { PageHeader } from "@/components/ui/admin";
import { Tile } from "@/components/ui/admin-server";
import { adminBtnSecondary } from "@/lib/admin/ui";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const params = await searchParams;
  const range = resolveAdminRange(params.range);
  const data = await getAdminReports(range);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Finance"
        title="Reports"
        subtitle={`Platform activity for ${data.summary.orderCount.toLocaleString()} orders in the selected period.`}
        actions={
          <Link href="/admin/orders" className={adminBtnSecondary}>
            View orders
          </Link>
        }
      />

      <div className="grid grid-cols-2 items-start gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
        <Tile
          label="Gross revenue"
          value={data.summary.grossRevenueDisplay}
          sublabel={`${data.summary.paidOrderCount} paid`}
          icon={BarChart3}
          tone="success"
        />
        <Tile label="Orders" value={data.summary.orderCount.toLocaleString()} icon={ShoppingBag} />
        <Tile label="Refunds" value={data.summary.refundCount.toLocaleString()} icon={AlertTriangle} tone="warn" />
        <Tile label="New users" value={data.summary.newUsers.toLocaleString()} icon={Users} />
        <Tile label="New vendors" value={data.summary.newVendors.toLocaleString()} icon={Store} />
        <Tile
          label="UGC reports"
          value={data.summary.pendingUgcReports.toLocaleString()}
          sublabel="pending"
          icon={AlertTriangle}
          tone={data.summary.pendingUgcReports > 0 ? "warn" : "default"}
        />
      </div>

      <AdminReportsClient data={data} />
    </div>
  );
}
