import Link from "next/link";
import { redirect } from "next/navigation";
import {
  requireCommerceMerchant,
  cosAdminDb,
  listVendorJimvioStores,
  pickActiveStore,
} from "@/lib/commerce-os";
import { StoreSelector } from "@/components/commerce-os/store-selector";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ storeId?: string }> };

export default async function CommerceOrdersPage({ searchParams }: Props) {
  const auth = await requireCommerceMerchant();
  if (!auth.ok) {
    if (auth.status === 401) redirect("/login?next=/commerce/orders");
    return <p className="text-sm text-[#4B5563]">{auth.error}</p>;
  }

  const { storeId } = await searchParams;
  const db = cosAdminDb();
  const stores = await listVendorJimvioStores(db, auth.vendorId);
  const active = pickActiveStore(stores, storeId);

  if (!active) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-semibold text-[#111827]">Orders</h1>
        <p className="text-sm text-[#6B7280]">Create a store to see store-channel orders.</p>
        <Link href="/commerce/stores" className="text-sm font-semibold text-[#FF5A1F]">
          Go to Stores
        </Link>
      </div>
    );
  }

  const { data: orders } = await db
    .from("orders")
    .select(
      "id, order_number, total_amount, currency, payment_status, status, created_at, buyer_id"
    )
    .eq("jimvio_store_id", active.id)
    .eq("vendor_id", auth.vendorId)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-[#111827]">Orders</h1>
        <p className="mt-1 text-sm text-[#6B7280]">
          Orders attributed to {active.name} (jimvio_store channel). Checkout is shared with Jimvio.
        </p>
      </div>

      <StoreSelector stores={stores} activeId={active.id} basePath="/commerce/orders" />

      {!orders?.length ? (
        <div className="rounded-lg border border-[#E5E7EB] bg-white p-5 text-sm text-[#6B7280]">
          No store orders yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-[#E5E7EB] bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#E5E7EB] bg-[#F8FAFC] text-xs uppercase text-[#6B7280]">
              <tr>
                <th className="px-4 py-2 font-medium">Order</th>
                <th className="px-4 py-2 font-medium">Payment</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Total</th>
                <th className="px-4 py-2 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-[#F3F4F6]">
                  <td className="px-4 py-3 font-medium text-[#111827]">
                    {o.order_number || o.id.slice(0, 8)}
                  </td>
                  <td className="px-4 py-3 text-[#6B7280]">{o.payment_status || "—"}</td>
                  <td className="px-4 py-3 text-[#6B7280]">{o.status || "—"}</td>
                  <td className="px-4 py-3 tabular-nums">
                    {o.currency || "USD"} {Number(o.total_amount || 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-[#6B7280]">
                    {new Date(o.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
