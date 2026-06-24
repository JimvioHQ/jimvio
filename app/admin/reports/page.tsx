import { getAdminReports } from "@/services/admin/getAdminReports";
import { resolveAdminRange } from "@/lib/admin/ranges";
import { AdminReportsClient } from "@/components/admin/admin-reports-client";
import { PageHeader } from "@/components/ui/admin";

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
        title="Revenue reports"
        subtitle="Track sales performance, net earnings, and category mix over time."
      />

      <AdminReportsClient data={data} />
    </div>
  );
}
