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

export default async function CommerceCustomersPage({ searchParams }: Props) {
  const auth = await requireCommerceMerchant();
  if (!auth.ok) {
    if (auth.status === 401) redirect("/login?next=/commerce/customers");
    return <p className="text-sm text-[#4B5563]">{auth.error}</p>;
  }

  const { storeId } = await searchParams;
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
    .select("buyer_id, total_amount, created_at")
    .eq("jimvio_store_id", active.id)
    .order("created_at", { ascending: false })
    .limit(200);

  const buyerIds = Array.from(
    new Set((orders ?? []).map((o) => o.buyer_id).filter(Boolean) as string[])
  );

  const profileById = new Map<string, { email: string | null; full_name: string | null }>();
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
    { id: string; label: string; orders: number; spent: number; lastOrder: string }
  >();
  for (const o of orders ?? []) {
    if (!o.buyer_id) continue;
    const profile = profileById.get(o.buyer_id);
    const label =
      profile?.email || profile?.full_name || o.buyer_id.slice(0, 8);
    const prev = byBuyer.get(o.buyer_id);
    if (!prev) {
      byBuyer.set(o.buyer_id, {
        id: o.buyer_id,
        label,
        orders: 1,
        spent: Number(o.total_amount || 0),
        lastOrder: o.created_at,
      });
    } else {
      prev.orders += 1;
      prev.spent += Number(o.total_amount || 0);
      if (o.created_at > prev.lastOrder) prev.lastOrder = o.created_at;
    }
  }
  const customers = Array.from(byBuyer.values()).sort(
    (a, b) => b.orders - a.orders
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-[#111827]">Customers</h1>
        <p className="mt-1 text-sm text-[#6B7280]">
          Derived from store orders (Jimvio auth accounts). No fabricated profiles.
        </p>
      </div>
      <StoreSelector
        stores={stores}
        activeId={active.id}
        basePath="/commerce/customers"
      />
      {!customers.length ? (
        <div className="rounded-lg border border-[#E5E7EB] bg-white p-5 text-sm text-[#6B7280]">
          No customers yet — they appear after store orders are placed.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-[#E5E7EB] bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#E5E7EB] bg-[#F8FAFC] text-xs uppercase text-[#6B7280]">
              <tr>
                <th className="px-4 py-2 font-medium">Customer</th>
                <th className="px-4 py-2 font-medium">Orders</th>
                <th className="px-4 py-2 font-medium">Spent</th>
                <th className="px-4 py-2 font-medium">Last order</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="border-b border-[#F3F4F6]">
                  <td className="px-4 py-3 font-medium text-[#111827]">{c.label}</td>
                  <td className="px-4 py-3 tabular-nums">{c.orders}</td>
                  <td className="px-4 py-3 tabular-nums">
                    {c.spent.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-[#6B7280]">
                    {new Date(c.lastOrder).toLocaleDateString()}
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
