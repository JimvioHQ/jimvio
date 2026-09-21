import Link from "next/link";
import { redirect } from "next/navigation";
import {
  requireCommerceMerchant,
  cosAdminDb,
  listVendorJimvioStores,
  pickActiveStore,
} from "@/lib/commerce-os";
import { StoreSelector } from "@/components/commerce-os/store-selector";
import {
  CommerceCard,
  CommerceEmptyState,
} from "@/components/commerce-os/commerce-shell";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ storeId?: string; status?: string }> };

function statusBadge(payment: string | null, fulfillment: string | null) {
  const p = (payment || "").toLowerCase();
  const f = (fulfillment || "").toLowerCase();
  if (p === "refunded" || f === "refunded") {
    return { label: "Refunded", className: "bg-stone-100 text-stone-700" };
  }
  if (f === "cancelled" || p === "cancelled") {
    return { label: "Cancelled", className: "bg-red-50 text-red-700" };
  }
  if (f === "delivered") {
    return { label: "Delivered", className: "bg-emerald-50 text-emerald-700" };
  }
  if (f === "shipped") {
    return { label: "Shipped", className: "bg-sky-50 text-sky-700" };
  }
  if (p === "paid" || p === "completed") {
    return { label: "Paid", className: "bg-emerald-50 text-emerald-700" };
  }
  if (p === "pending" || p === "failed") {
    return { label: "Pending", className: "bg-amber-50 text-amber-700" };
  }
  return { label: fulfillment || payment || "—", className: "bg-[#F3F4F6] text-[#4B5563]" };
}

export default async function CommerceOrdersPage({ searchParams }: Props) {
  const auth = await requireCommerceMerchant();
  if (!auth.ok) {
    if (auth.status === 401) redirect("/login?next=/commerce/orders");
    return <p className="text-sm text-[#4B5563]">{auth.error}</p>;
  }

  const { storeId, status } = await searchParams;
  const db = cosAdminDb();
  const stores = await listVendorJimvioStores(db, auth.vendorId);
  const active = pickActiveStore(stores, storeId);

  if (!active) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight text-[#111827]">
          Orders
        </h1>
        <p className="text-sm text-[#6B7280]">
          Create a store to manage orders for your storefront.
        </p>
        <Link href="/commerce/stores" className="text-sm font-semibold text-[#FF5A1F]">
          Go to Stores
        </Link>
      </div>
    );
  }

  let query = db
    .from("orders")
    .select(
      "id, order_number, total_amount, currency, payment_status, status, created_at, buyer_id"
    )
    .eq("jimvio_store_id", active.id)
    .eq("vendor_id", auth.vendorId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (status === "paid") {
    query = query.in("payment_status", ["paid", "completed"]);
  } else if (status === "pending") {
    query = query.in("payment_status", ["pending", "failed"]);
  } else if (status === "shipped") {
    query = query.eq("status", "shipped");
  } else if (status === "delivered") {
    query = query.eq("status", "delivered");
  } else if (status === "cancelled") {
    query = query.eq("status", "cancelled");
  } else if (status === "refunded") {
    query = query.or("status.eq.refunded,payment_status.eq.refunded");
  }

  const { data: orders } = await query;

  const filters = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending" },
    { key: "paid", label: "Paid" },
    { key: "shipped", label: "Shipped" },
    { key: "delivered", label: "Delivered" },
    { key: "cancelled", label: "Cancelled" },
    { key: "refunded", label: "Refunded" },
  ] as const;

  const activeFilter = status || "all";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#111827]">
          Orders
        </h1>
        <p className="mt-1 text-sm text-[#6B7280]">
          Orders from {active.name}. Checkout and payments use Jimvio Commerce Core.
        </p>
      </div>

      <StoreSelector stores={stores} activeId={active.id} basePath="/commerce/orders" />

      <div className="flex gap-1 overflow-x-auto pb-1">
        {filters.map((f) => {
          const href =
            f.key === "all"
              ? `/commerce/orders?storeId=${active.id}`
              : `/commerce/orders?storeId=${active.id}&status=${f.key}`;
          const on = activeFilter === f.key;
          return (
            <Link
              key={f.key}
              href={href}
              className={
                on
                  ? "shrink-0 rounded-full bg-[#FF5A1F]/10 px-3 py-1.5 text-xs font-semibold text-[#FF5A1F]"
                  : "shrink-0 rounded-full border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-semibold text-[#6B7280]"
              }
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      {!orders?.length ? (
        <CommerceEmptyState
          title="No orders yet"
          description="Orders from your storefront will appear here."
        />
      ) : (
        <>
          <div className="space-y-2 md:hidden">
            {orders.map((o) => {
              const badge = statusBadge(o.payment_status, o.status);
              return (
                <CommerceCard key={o.id} className="p-4">
                  <Link href={`/commerce/orders/${o.id}?storeId=${active.id}`} className="block">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[#111827]">
                        {o.order_number || o.id.slice(0, 8)}
                      </p>
                      <p className="mt-1 text-[11px] text-[#9CA3AF]">
                        {new Date(o.created_at).toLocaleString()}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-semibold tabular-nums">
                    {o.currency || "USD"} {Number(o.total_amount || 0).toFixed(2)}
                  </p>
                  </Link>
                </CommerceCard>
              );
            })}
          </div>

          <CommerceCard className="hidden overflow-hidden md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#E5E7EB] bg-[#F8FAFC] text-[11px] uppercase tracking-wide text-[#6B7280]">
                <tr>
                  <th className="px-4 py-3 font-medium">Order</th>
                  <th className="px-4 py-3 font-medium">Payment</th>
                  <th className="px-4 py-3 font-medium">Fulfillment</th>
                  <th className="px-4 py-3 font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const badge = statusBadge(o.payment_status, o.status);
                  return (
                    <tr key={o.id} className="border-b border-[#F3F4F6] last:border-0">
                      <td className="px-4 py-3 font-medium text-[#111827]">
                        <Link
                          href={`/commerce/orders/${o.id}?storeId=${active.id}`}
                          className="hover:text-[#FF5A1F]"
                        >
                          {o.order_number || o.id.slice(0, 8)}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-[#6B7280]">
                        {o.payment_status || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${badge.className}`}
                        >
                          {o.status || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {o.currency || "USD"} {Number(o.total_amount || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-[#6B7280]">
                        {new Date(o.created_at).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CommerceCard>
        </>
      )}
    </div>
  );
}
