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
import { formatStoreMoney } from "@/lib/commerce-os/storefront/money";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ storeId?: string; status?: string }> };

function paymentLabel(payment: string | null | undefined) {
  const p = (payment || "").toLowerCase();
  if (p === "refunded") return { label: "Refunded", className: "bg-stone-100 text-stone-700" };
  if (p === "cancelled") return { label: "Cancelled", className: "bg-red-50 text-red-700" };
  if (p === "failed") return { label: "Payment failed", className: "bg-red-50 text-red-700" };
  if (p === "paid" || p === "completed" || p === "success") {
    return { label: "Paid", className: "bg-emerald-50 text-emerald-700" };
  }
  if (p === "pending" || !p) {
    return { label: "Pending payment", className: "bg-amber-50 text-amber-800" };
  }
  return { label: payment || "—", className: "bg-[#F3F4F6] text-[#4B5563]" };
}

function fulfillmentLabel(
  payment: string | null | undefined,
  status: string | null | undefined
) {
  const p = (payment || "").toLowerCase();
  const s = (status || "").toLowerCase();
  const unpaid = !["paid", "completed", "success"].includes(p);

  if (s === "refunded" || p === "refunded") {
    return { label: "Refunded", className: "bg-stone-100 text-stone-700" };
  }
  if (s === "cancelled" || p === "cancelled") {
    return { label: "Cancelled", className: "bg-red-50 text-red-700" };
  }
  if (s === "fulfillment_exception" || s === "exception") {
    return { label: "Exception", className: "bg-red-50 text-red-700" };
  }
  if (s === "delivered") {
    return { label: "Delivered", className: "bg-emerald-50 text-emerald-700" };
  }
  if (s === "shipped") {
    return { label: "Shipped", className: "bg-sky-50 text-sky-700" };
  }
  if (s === "processing" || s === "confirmed") {
    return { label: "Processing", className: "bg-indigo-50 text-indigo-700" };
  }
  if (unpaid) {
    return { label: "Waiting for payment", className: "bg-[#F3F4F6] text-[#6B7280]" };
  }
  return { label: "Unfulfilled", className: "bg-amber-50 text-amber-800" };
}

type OrderItemSnap = {
  product_name?: string | null;
  product_image?: string | null;
  quantity?: number | null;
};

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
      `
      id, order_number, total_amount, currency, payment_status, status, created_at,
      buyer_id, tracking_number,
      order_items ( product_name, product_image, quantity )
    `
    )
    .eq("jimvio_store_id", active.id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (status === "paid") {
    query = query.in("payment_status", ["paid", "completed"]);
  } else if (status === "pending") {
    query = query.in("payment_status", ["pending", "failed"]);
  } else if (status === "processing") {
    query = query
      .in("payment_status", ["paid", "completed"])
      .in("status", ["confirmed", "processing", "paid"]);
  } else if (status === "shipped") {
    query = query.eq("status", "shipped");
  } else if (status === "delivered") {
    query = query.eq("status", "delivered");
  } else if (status === "cancelled") {
    query = query.eq("status", "cancelled");
  } else if (status === "refunded") {
    query = query.or("status.eq.refunded,payment_status.eq.refunded");
  }

  const { data: rawOrders } = await query;
  const orders = rawOrders ?? [];

  const buyerIds = [
    ...new Set(
      orders
        .map((o) => o.buyer_id as string | null)
        .filter((id): id is string => Boolean(id))
    ),
  ];
  const buyerMap = new Map<
    string,
    { full_name?: string | null; email?: string | null }
  >();
  if (buyerIds.length) {
    const { data: buyers } = await db
      .from("profiles")
      .select("id, full_name, email")
      .in("id", buyerIds);
    for (const b of buyers ?? []) {
      buyerMap.set(b.id, { full_name: b.full_name, email: b.email });
    }
  }

  const filters = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending payment" },
    { key: "paid", label: "Paid" },
    { key: "processing", label: "Processing" },
    { key: "shipped", label: "Shipped" },
    { key: "delivered", label: "Delivered" },
    { key: "cancelled", label: "Cancelled" },
    { key: "refunded", label: "Refunded" },
  ] as const;

  const activeFilter = status || "all";
  const currency = active.default_currency || "USD";

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#111827]">
            Orders
          </h1>
        </div>
        <StoreSelector
          stores={stores}
          activeId={active.id}
          basePath="/commerce/orders"
        />
      </div>

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
                  ? "shrink-0 rounded-lg bg-[#FF5A1F]/10 px-3 py-1.5 text-xs font-semibold text-[#FF5A1F]"
                  : "shrink-0 rounded-lg border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-semibold text-[#6B7280]"
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
          description="When customers place orders, they’ll appear here — including pending payment."
        />
      ) : (
        <>
          <div className="space-y-2 md:hidden">
            {orders.map((o) => {
              const pay = paymentLabel(o.payment_status);
              const fulfill = fulfillmentLabel(o.payment_status, o.status);
              const items = (Array.isArray(o.order_items) ? o.order_items : []) as OrderItemSnap[];
              const first = items[0];
              const qty = items.reduce((s, i) => s + Number(i.quantity || 0), 0);
              const profile = o.buyer_id ? buyerMap.get(o.buyer_id) : undefined;
              return (
                <CommerceCard key={o.id} className="p-4">
                  <Link
                    href={`/commerce/orders/${o.id}?storeId=${active.id}`}
                    className="block space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-[#111827]">
                          {o.order_number ? `#${o.order_number}` : o.id.slice(0, 8)}
                        </p>
                        <p className="mt-0.5 text-[11px] text-[#9CA3AF]">
                          {new Date(o.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span
                          className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${pay.className}`}
                        >
                          {pay.label}
                        </span>
                        <span
                          className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${fulfill.className}`}
                        >
                          {fulfill.label}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {first?.product_image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={first.product_image}
                          alt=""
                          className="h-12 w-12 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-lg bg-[#F3F4F6]" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[#111827]">
                          {first?.product_name || "Order items"}
                          {items.length > 1 ? ` +${items.length - 1}` : ""}
                        </p>
                        <p className="text-[11px] text-[#6B7280]">
                          Qty {qty || 1}
                          {profile?.full_name || profile?.email
                            ? ` · ${profile.full_name || profile.email}`
                            : ""}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-semibold tabular-nums">
                        {formatStoreMoney(
                          Number(o.total_amount || 0),
                          o.currency || currency
                        )}
                      </p>
                    </div>
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
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 font-medium">Payment</th>
                  <th className="px-4 py-3 font-medium">Fulfillment</th>
                  <th className="px-4 py-3 font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const pay = paymentLabel(o.payment_status);
                  const fulfill = fulfillmentLabel(o.payment_status, o.status);
                  const items = (Array.isArray(o.order_items)
                    ? o.order_items
                    : []) as OrderItemSnap[];
                  const first = items[0];
                  const qty = items.reduce((s, i) => s + Number(i.quantity || 0), 0);
                  const profile = o.buyer_id
                    ? buyerMap.get(o.buyer_id)
                    : undefined;
                  return (
                    <tr
                      key={o.id}
                      className="border-b border-[#F3F4F6] last:border-0"
                    >
                      <td className="px-4 py-3 font-medium text-[#111827]">
                        <Link
                          href={`/commerce/orders/${o.id}?storeId=${active.id}`}
                          className="hover:text-[#FF5A1F]"
                        >
                          {o.order_number
                            ? `#${o.order_number}`
                            : o.id.slice(0, 8)}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-[#6B7280]">
                        <span className="line-clamp-1">
                          {profile?.full_name || profile?.email || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex max-w-[220px] items-center gap-2">
                          {first?.product_image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={first.product_image}
                              alt=""
                              className="h-9 w-9 shrink-0 rounded-md object-cover"
                            />
                          ) : (
                            <div className="h-9 w-9 shrink-0 rounded-md bg-[#F3F4F6]" />
                          )}
                          <div className="min-w-0">
                            <p className="truncate font-medium text-[#111827]">
                              {first?.product_name || "Items"}
                            </p>
                            <p className="text-[11px] text-[#9CA3AF]">
                              Qty {qty || 1}
                              {items.length > 1 ? ` · ${items.length} lines` : ""}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${pay.className}`}
                        >
                          {pay.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${fulfill.className}`}
                        >
                          {fulfill.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 tabular-nums font-medium">
                        {formatStoreMoney(
                          Number(o.total_amount || 0),
                          o.currency || currency
                        )}
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
