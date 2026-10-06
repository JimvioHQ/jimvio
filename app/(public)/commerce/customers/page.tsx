import Link from "next/link";
import { redirect } from "next/navigation";
import {
  requireCommerceMerchant,
  cosAdminDb,
  listVendorJimvioStores,
  pickActiveStore,
  formatCommerceMoney,
  toCommerceUsd,
} from "@/lib/commerce-os";
import { StoreSelector } from "@/components/commerce-os/store-selector";
import {
  CommerceCard,
  CommerceEmptyState,
} from "@/components/commerce-os/commerce-shell";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ storeId?: string; q?: string }>;
};

export default async function CommerceCustomersPage({ searchParams }: Props) {
  const auth = await requireCommerceMerchant();
  if (!auth.ok) {
    if (auth.status === 401) redirect("/login?next=/commerce/customers");
    return <p className="text-sm text-[#4B5563]">{auth.error}</p>;
  }

  const { storeId, q } = await searchParams;
  const db = cosAdminDb();
  const stores = await listVendorJimvioStores(db, auth.vendorId);
  const active = pickActiveStore(stores, storeId);

  if (!active) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-semibold text-[#111827]">Customers</h1>
        <Link href="/commerce/stores" className="text-sm font-semibold text-[#FF5A1F]">
          Create a store
        </Link>
      </div>
    );
  }

  const { data: orders } = await db
    .from("orders")
    .select("buyer_id, total_amount, currency, created_at, payment_status")
    .eq("jimvio_store_id", active.id)
    .order("created_at", { ascending: false })
    .limit(500);

  const buyerIds = Array.from(
    new Set((orders ?? []).map((o) => o.buyer_id).filter(Boolean) as string[]),
  );

  const profileById = new Map<
    string,
    { email: string | null; full_name: string | null }
  >();
  if (buyerIds.length) {
    const { data: profiles } = await db
      .from("profiles")
      .select("id, email, full_name")
      .in("id", buyerIds);
    for (const p of profiles ?? []) {
      profileById.set(p.id, { email: p.email, full_name: p.full_name });
    }
  }

  const byBuyer = new Map<
    string,
    {
      id: string;
      name: string;
      email: string | null;
      orders: number;
      spent: number;
      lastOrder: string;
      status: string;
    }
  >();
  for (const o of orders ?? []) {
    if (!o.buyer_id) continue;
    const profile = profileById.get(o.buyer_id);
    const paid = ["paid", "completed", "success"].includes(
      String(o.payment_status || "").toLowerCase(),
    );
    const amount = paid ? toCommerceUsd(o.total_amount, o.currency) : 0;
    const prev = byBuyer.get(o.buyer_id);
    if (!prev) {
      byBuyer.set(o.buyer_id, {
        id: o.buyer_id,
        name: profile?.full_name || profile?.email || "Customer",
        email: profile?.email || null,
        orders: 1,
        spent: amount,
        lastOrder: o.created_at,
        status: paid ? "Active" : "Prospect",
      });
    } else {
      prev.orders += 1;
      prev.spent += amount;
      if (o.created_at > prev.lastOrder) prev.lastOrder = o.created_at;
      if (paid) prev.status = "Active";
    }
  }

  const needle = (q || "").trim().toLowerCase();
  const customers = Array.from(byBuyer.values())
    .filter((c) => {
      if (!needle) return true;
      return (
        c.name.toLowerCase().includes(needle) ||
        (c.email || "").toLowerCase().includes(needle)
      );
    })
    .sort((a, b) => b.orders - a.orders);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-[#111827]">Customers</h1>
        <p className="mt-1 text-sm text-[#6B7280]">
          Who bought from {active.name}. Derived from store-scoped orders.
        </p>
      </div>
      <StoreSelector
        stores={stores}
        activeId={active.id}
        basePath="/commerce/customers"
      />

      <form className="flex flex-wrap gap-2" action="/commerce/customers" method="get">
        <input type="hidden" name="storeId" value={active.id} />
        <input
          name="q"
          defaultValue={q || ""}
          placeholder="Search name or email..."
          className="h-10 min-w-[220px] flex-1 rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm"
          aria-label="Search customers"
        />
        <button
          type="submit"
          className="h-10 rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm font-semibold"
        >
          Search
        </button>
      </form>

      {!customers.length ? (
        <CommerceEmptyState
          title="No customers yet"
          description="Customers appear after store orders are placed."
          action={
            <Link
              href={`/commerce/orders?storeId=${active.id}`}
              className="rounded-lg bg-[#FF5A1F] px-4 py-2 text-xs font-semibold text-white"
            >
              View orders
            </Link>
          }
        />
      ) : (
        <>
          <div className="space-y-2 md:hidden">
            {customers.map((c) => (
              <CommerceCard key={c.id} className="p-3">
                <p className="font-semibold text-[#111827]">{c.name}</p>
                <p className="text-xs text-[#6B7280]">{c.email || "—"}</p>
                <p className="mt-2 text-sm tabular-nums">
                  {c.orders} orders · {formatCommerceMoney(c.spent, "USD")}
                </p>
              </CommerceCard>
            ))}
          </div>
          <CommerceCard className="hidden overflow-hidden md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#E5E7EB] bg-[#F8FAFC] text-[11px] uppercase tracking-wide text-[#6B7280]">
                <tr>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Orders</th>
                  <th className="px-4 py-3 font-medium">Total spent</th>
                  <th className="px-4 py-3 font-medium">Last order</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id} className="border-b border-[#F3F4F6] last:border-0">
                    <td className="px-4 py-3 font-medium text-[#111827]">{c.name}</td>
                    <td className="px-4 py-3 text-[#6B7280]">{c.email || "—"}</td>
                    <td className="px-4 py-3 tabular-nums">{c.orders}</td>
                    <td className="px-4 py-3 tabular-nums font-medium">
                      {formatCommerceMoney(c.spent, "USD")}
                    </td>
                    <td className="px-4 py-3 text-[#6B7280]">
                      {new Date(c.lastOrder).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-[#6B7280]">{c.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CommerceCard>
        </>
      )}
    </div>
  );
}
