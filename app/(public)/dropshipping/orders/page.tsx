import { redirect } from "next/navigation";
import { requireDropshippingMerchant, dsAdminDb } from "@/lib/dropshipping";

export const dynamic = "force-dynamic";

export default async function DropshippingOrdersPage() {
  const auth = await requireDropshippingMerchant();
  if (!auth.ok) {
    if (auth.status === 401) redirect("/login?next=/dropshipping/orders");
    return <p className="text-sm text-[#4B5563]">{auth.error}</p>;
  }

  const db = dsAdminDb();
  const { data: orders, error } = await db
    .from("orders")
    .select(
      "id, order_number, status, payment_status, fulfillment_status_normalized, total_amount, currency, external_order_id, order_channel, merchant_store_id, created_at, merchant_stores(name, domain)"
    )
    .eq("vendor_id", auth.vendorId)
    .not("merchant_store_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-[#111827]">Orders</h1>
        <p className="mt-1 text-sm text-[#6B7280]">
          Orders ingested from your connected stores.
        </p>
      </div>

      {error ? (
        <p className="text-sm font-medium text-red-600">{error.message}</p>
      ) : null}

      {!orders?.length ? (
        <div className="rounded-lg border border-[#E5E7EB] bg-white p-5 text-sm text-[#6B7280]">
          No store orders yet. New Shopify orders appear here after webhook delivery.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[#E5E7EB] bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[#E5E7EB] bg-[#F8FAFC] text-xs uppercase text-[#6B7280]">
              <tr>
                <th className="px-3 py-2 font-medium">Order</th>
                <th className="px-3 py-2 font-medium">Store</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Fulfillment</th>
                <th className="px-3 py-2 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const store = Array.isArray(o.merchant_stores)
                  ? o.merchant_stores[0]
                  : o.merchant_stores;
                return (
                  <tr key={o.id} className="border-b border-[#F3F4F6]">
                    <td className="px-3 py-2.5">
                      <p className="font-medium text-[#111827]">
                        #{o.order_number ?? o.id.slice(0, 8)}
                      </p>
                      <p className="text-[11px] text-[#9CA3AF]">
                        {o.order_channel}
                        {o.external_order_id ? ` · ext ${o.external_order_id}` : ""}
                      </p>
                    </td>
                    <td className="px-3 py-2.5 text-[#4B5563]">
                      {(store as { name?: string } | null)?.name ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 text-[#4B5563]">{o.status}</td>
                    <td className="px-3 py-2.5 text-[#4B5563]">
                      {o.fulfillment_status_normalized ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums">
                      {Number(o.total_amount).toFixed(2)} {o.currency}
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
