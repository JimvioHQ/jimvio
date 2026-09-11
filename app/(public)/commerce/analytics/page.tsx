import Link from "next/link";
import { redirect } from "next/navigation";
import {
  requireCommerceMerchant,
  cosAdminDb,
  getStoreAnalytics,
  listVendorJimvioStores,
  pickActiveStore,
} from "@/lib/commerce-os";
import { StoreSelector } from "@/components/commerce-os/store-selector";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ storeId?: string }> };

export default async function CommerceAnalyticsPage({ searchParams }: Props) {
  const auth = await requireCommerceMerchant();
  if (!auth.ok) {
    if (auth.status === 401) redirect("/login?next=/commerce/analytics");
    return <p className="text-sm text-[#4B5563]">{auth.error}</p>;
  }

  const { storeId } = await searchParams;
  const db = cosAdminDb();
  const stores = await listVendorJimvioStores(db, auth.vendorId);
  const active = pickActiveStore(stores, storeId);

  if (!active) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-semibold text-[#111827]">Analytics</h1>
        <Link href="/commerce/stores" className="text-sm font-semibold text-[#FF5A1F]">
          Create a store
        </Link>
      </div>
    );
  }

  const analytics = await getStoreAnalytics(db, active.id, auth.vendorId, 30);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-[#111827]">Analytics</h1>
        <p className="mt-1 text-sm text-[#6B7280]">
          Last 30 days for {active.name}. Visitors and conversion are omitted until tracked.
        </p>
      </div>
      <StoreSelector
        stores={stores}
        activeId={active.id}
        basePath="/commerce/analytics"
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { label: "Orders", value: String(analytics.orders) },
          { label: "Paid orders", value: String(analytics.paidOrders) },
          { label: "Revenue", value: String(analytics.revenue) },
          { label: "AOV", value: String(analytics.averageOrderValue) },
          { label: "Products published", value: String(analytics.productsPublished) },
        ].map((m) => (
          <div key={m.label} className="rounded-lg border border-[#E5E7EB] bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
              {m.label}
            </p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-[#111827]">
              {m.value}
            </p>
          </div>
        ))}
        <div className="rounded-lg border border-dashed border-[#E5E7EB] bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
            Visitors
          </p>
          <p className="mt-2 text-sm text-[#6B7280]">null — not tracked yet</p>
        </div>
        <div className="rounded-lg border border-dashed border-[#E5E7EB] bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
            Conversion
          </p>
          <p className="mt-2 text-sm text-[#6B7280]">null — not tracked yet</p>
        </div>
      </div>
    </div>
  );
}
