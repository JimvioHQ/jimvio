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
import { CommerceStatusBadge } from "@/components/commerce-os/commerce-status-badge";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ storeId?: string }> };

function fulfillTone(status: string | null | undefined) {
  const s = (status || "").toLowerCase();
  if (s === "delivered") return { label: "Delivered", tone: "success" as const };
  if (s === "shipped") return { label: "Shipped", tone: "info" as const };
  if (s === "fulfillment_exception" || s === "exception") {
    return { label: "Exception", tone: "danger" as const };
  }
  if (s === "processing" || s === "confirmed") {
    return { label: "Processing", tone: "warning" as const };
  }
  return { label: "Awaiting", tone: "neutral" as const };
}

/**
 * Native-store fulfillment overview (Jimvio Fulfillment network).
 */
export default async function CommerceFulfillmentPage({ searchParams }: Props) {
  const auth = await requireCommerceMerchant();
  if (!auth.ok) {
    if (auth.status === 401) redirect("/login?next=/commerce/fulfillment");
    return <p className="text-sm text-[#4B5563]">{auth.error}</p>;
  }

  const { storeId } = await searchParams;
  const db = cosAdminDb();
  const stores = await listVendorJimvioStores(db, auth.vendorId);
  const active = pickActiveStore(stores, storeId);

  if (!active) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-semibold text-[#111827]">Fulfillment</h1>
        <Link href="/commerce/stores" className="text-sm font-semibold text-[#FF5A1F]">
          Create a store
        </Link>
      </div>
    );
  }

  const storeFilter = active.id;

  const [pendingPaid, processing, shipped, tracking, exceptions, delivered, recent] =
    await Promise.all([
      db
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("jimvio_store_id", storeFilter)
        .in("payment_status", ["paid", "completed"])
        .in("status", ["confirmed", "processing", "paid"]),
      db
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("jimvio_store_id", storeFilter)
        .in("status", ["confirmed", "processing"]),
      db
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("jimvio_store_id", storeFilter)
        .eq("status", "shipped"),
      db
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("jimvio_store_id", storeFilter)
        .not("tracking_number", "is", null),
      db
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("jimvio_store_id", storeFilter)
        .eq("status", "fulfillment_exception"),
      db
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("jimvio_store_id", storeFilter)
        .eq("status", "delivered"),
      db
        .from("orders")
        .select(
          `
          id, order_number, status, payment_status, tracking_number, updated_at, created_at, buyer_id,
          order_items ( product_name, quantity )
        `,
        )
        .eq("jimvio_store_id", storeFilter)
        .in("payment_status", ["paid", "completed"])
        .order("updated_at", { ascending: false })
        .limit(40),
    ]);

  const rows = recent.data ?? [];
  const buyerIds = Array.from(
    new Set(rows.map((o) => o.buyer_id).filter(Boolean) as string[]),
  );
  const profileById = new Map<string, string>();
  if (buyerIds.length) {
    const { data: profiles } = await db
      .from("profiles")
      .select("id, email, full_name")
      .in("id", buyerIds);
    for (const p of profiles ?? []) {
      profileById.set(p.id, p.full_name || p.email || "Customer");
    }
  }

  const kpis = [
    {
      label: "Awaiting fulfillment",
      value: pendingPaid.count ?? 0,
      href: `/commerce/orders?storeId=${active.id}&status=processing`,
    },
    {
      label: "Processing",
      value: processing.count ?? 0,
      href: `/commerce/orders?storeId=${active.id}&status=processing`,
    },
    {
      label: "Shipped",
      value: shipped.count ?? 0,
      href: `/commerce/orders?storeId=${active.id}&status=shipped`,
    },
    {
      label: "Tracking",
      value: tracking.count ?? 0,
      href: `/commerce/fulfillment?storeId=${active.id}`,
    },
    {
      label: "Exceptions",
      value: exceptions.count ?? 0,
      href: `/commerce/fulfillment?storeId=${active.id}`,
    },
    {
      label: "Delivered",
      value: delivered.count ?? 0,
      href: `/commerce/orders?storeId=${active.id}&status=delivered`,
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#111827]">
            Fulfillment
          </h1>
          <p className="mt-1 text-sm text-[#6B7280]">
            Jimvio Fulfillment for paid orders on {active.name}.
          </p>
        </div>
        <StoreSelector
          stores={stores}
          activeId={active.id}
          basePath="/commerce/fulfillment"
        />
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-6">
        {kpis.map((kpi) => (
          <Link key={kpi.label} href={kpi.href}>
            <CommerceCard className="h-full p-4 transition hover:border-[#FF5A1F]/35">
              <p className="text-xs text-[#6B7280]">{kpi.label}</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums">
                {kpi.value}
              </p>
            </CommerceCard>
          </Link>
        ))}
      </div>

      {!rows.length ? (
        <CommerceEmptyState
          title="No fulfillment activity yet"
          description="Paid orders appear here when they need shipping or tracking updates."
          action={
            <Link
              href={`/commerce/orders?storeId=${active.id}&status=paid`}
              className="rounded-lg bg-[#FF5A1F] px-4 py-2 text-xs font-semibold text-white"
            >
              View paid orders
            </Link>
          }
        />
      ) : (
        <>
          <div className="space-y-2 md:hidden">
            {rows.map((o) => {
              const tone = fulfillTone(o.status);
              const items = Array.isArray(o.order_items) ? o.order_items : [];
              const qty = items.reduce(
                (s, i) => s + Number((i as { quantity?: number }).quantity || 0),
                0,
              );
              return (
                <Link
                  key={o.id}
                  href={`/commerce/orders/${o.id}?storeId=${active.id}`}
                >
                  <CommerceCard className="mb-2 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-[#111827]">
                          {o.order_number ? `#${o.order_number}` : o.id.slice(0, 8)}
                        </p>
                        <p className="text-xs text-[#6B7280]">
                          {o.buyer_id
                            ? profileById.get(o.buyer_id) || "Customer"
                            : "Guest"}{" "}
                          · {qty || 1} items
                        </p>
                      </div>
                      <CommerceStatusBadge label={tone.label} tone={tone.tone} />
                    </div>
                    {o.tracking_number ? (
                      <p className="mt-2 text-xs text-[#6B7280]">
                        Tracking {o.tracking_number}
                      </p>
                    ) : null}
                  </CommerceCard>
                </Link>
              );
            })}
          </div>

          <CommerceCard className="hidden overflow-hidden md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#E5E7EB] bg-[#F8FAFC] text-[11px] uppercase tracking-wide text-[#6B7280]">
                <tr>
                  <th className="px-4 py-3 font-medium">Order</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Items</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Tracking</th>
                  <th className="px-4 py-3 font-medium">Updated</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((o) => {
                  const tone = fulfillTone(o.status);
                  const items = Array.isArray(o.order_items) ? o.order_items : [];
                  const qty = items.reduce(
                    (s, i) =>
                      s + Number((i as { quantity?: number }).quantity || 0),
                    0,
                  );
                  return (
                    <tr key={o.id} className="border-b border-[#F3F4F6] last:border-0">
                      <td className="px-4 py-3 font-medium">
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
                        {o.buyer_id
                          ? profileById.get(o.buyer_id) || "Customer"
                          : "Guest"}
                      </td>
                      <td className="px-4 py-3 tabular-nums">{qty || 1}</td>
                      <td className="px-4 py-3">
                        <CommerceStatusBadge label={tone.label} tone={tone.tone} />
                      </td>
                      <td className="px-4 py-3 text-[#6B7280]">
                        {o.tracking_number || "—"}
                      </td>
                      <td className="px-4 py-3 text-[#6B7280]">
                        {new Date(o.updated_at || o.created_at).toLocaleDateString()}
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
