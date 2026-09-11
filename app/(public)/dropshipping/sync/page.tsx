import { redirect } from "next/navigation";
import { requireDropshippingMerchant, dsAdminDb } from "@/lib/dropshipping";

export const dynamic = "force-dynamic";

export default async function DropshippingSyncPage() {
  const auth = await requireDropshippingMerchant();
  if (!auth.ok) {
    if (auth.status === 401) redirect("/login?next=/commerce/sync");
    return <p className="text-sm text-[#4B5563]">{auth.error}</p>;
  }

  const db = dsAdminDb();
  const { data: jobs, error } = await db
    .from("ds_sync_jobs")
    .select(
      "id, job_type, status, attempts, error, created_at, started_at, completed_at, store_id, merchant_stores(name)"
    )
    .eq("vendor_id", auth.vendorId)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-[#111827]">Sync</h1>
        <p className="mt-1 text-sm text-[#6B7280]">
          Recent inventory, price, and connection sync jobs.
        </p>
      </div>

      {error ? (
        <p className="text-sm font-medium text-red-600">{error.message}</p>
      ) : null}

      {!jobs?.length ? (
        <div className="rounded-lg border border-[#E5E7EB] bg-white p-5 text-sm text-[#6B7280]">
          No sync jobs yet. Trigger sync from My Stores.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[#E5E7EB] bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[#E5E7EB] bg-[#F8FAFC] text-xs uppercase text-[#6B7280]">
              <tr>
                <th className="px-3 py-2 font-medium">Job</th>
                <th className="px-3 py-2 font-medium">Store</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => {
                const store = Array.isArray(j.merchant_stores)
                  ? j.merchant_stores[0]
                  : j.merchant_stores;
                return (
                  <tr key={j.id} className="border-b border-[#F3F4F6]">
                    <td className="px-3 py-2.5">
                      <p className="font-medium text-[#111827]">{j.job_type}</p>
                      {j.error ? (
                        <p className="text-[11px] text-red-600">{j.error}</p>
                      ) : null}
                    </td>
                    <td className="px-3 py-2.5 text-[#4B5563]">
                      {(store as { name?: string } | null)?.name ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 text-[#4B5563]">
                      {j.status}
                      {j.attempts ? ` · ${j.attempts} attempt(s)` : ""}
                    </td>
                    <td className="px-3 py-2.5 text-[#6B7280]">
                      {new Date(j.created_at).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
