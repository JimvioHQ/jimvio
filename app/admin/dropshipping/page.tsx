import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

export default async function AdminDropshippingPage() {
  const db = createServiceRoleClient();

  const [
    stores,
    links,
    jobsPending,
    jobsFailed,
    storeOrders,
    apiKeys,
  ] = await Promise.all([
    db.from("merchant_stores").select("id", { count: "exact", head: true }),
    db.from("store_product_links").select("id", { count: "exact", head: true }),
    db
      .from("ds_sync_jobs")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    db
      .from("ds_sync_jobs")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed"),
    db
      .from("orders")
      .select("id", { count: "exact", head: true })
      .not("merchant_store_id", "is", null),
    db
      .from("ds_api_keys")
      .select("id", { count: "exact", head: true })
      .is("revoked_at", null),
  ]);

  const cards = [
    { label: "Merchant stores", value: stores.count ?? 0 },
    { label: "Product links", value: links.count ?? 0 },
    { label: "Store channel orders", value: storeOrders.count ?? 0 },
    { label: "Pending sync jobs", value: jobsPending.count ?? 0 },
    { label: "Failed sync jobs", value: jobsFailed.count ?? 0 },
    { label: "Active API keys", value: apiKeys.count ?? 0 },
  ];

  const { data: recentLogs } = await db
    .from("ds_integration_logs")
    .select("id, operation, status, message, error_code, created_at, vendor_id")
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div className="space-y-6 p-1">
      <div>
        <h1 className="text-xl font-semibold text-[#111827]">Dropshipping OS</h1>
        <p className="mt-1 text-sm text-[#6B7280]">
          Platform-wide metrics for merchant store connections and sync health.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-lg border border-[#E5E7EB] bg-white p-4"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
              {c.label}
            </p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-[#111827]">
              {c.value}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-[#E5E7EB] bg-white p-4">
        <p className="text-sm font-medium text-[#111827]">Recent integration logs</p>
        {!recentLogs?.length ? (
          <p className="mt-2 text-sm text-[#6B7280]">No logs yet.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {recentLogs.map((log) => (
              <li key={log.id} className="border-b border-[#F3F4F6] pb-2">
                <span className="font-medium text-[#111827]">{log.operation}</span>
                <span className="text-[#6B7280]"> · {log.status}</span>
                {log.error_code ? (
                  <span className="text-red-600"> · {log.error_code}</span>
                ) : null}
                {log.message ? (
                  <p className="text-xs text-[#6B7280]">{log.message}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
