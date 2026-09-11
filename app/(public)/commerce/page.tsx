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
import { CreateStoreForm } from "@/components/commerce-os/create-store-form";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ storeId?: string }> };

export default async function CommerceOverviewPage({ searchParams }: Props) {
  const auth = await requireCommerceMerchant();
  if (!auth.ok) {
    if (auth.status === 401) redirect("/login?next=/commerce");
    return (
      <div className="rounded-lg border border-[#E5E7EB] bg-white p-5 text-sm text-[#4B5563]">
        {auth.error}{" "}
        <Link href="/seller/products" className="font-semibold text-[#FF5A1F]">
          Open seller dashboard
        </Link>
      </div>
    );
  }

  const { storeId } = await searchParams;
  const db = cosAdminDb();
  const stores = await listVendorJimvioStores(db, auth.vendorId);
  const active = pickActiveStore(stores, storeId);

  if (!active) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-semibold text-[#111827]">Overview</h1>
          <p className="mt-1 text-sm text-[#6B7280]">
            Create your first native Jimvio storefront to start selling.
          </p>
        </div>
        <CreateStoreForm />
      </div>
    );
  }

  const analytics = await getStoreAnalytics(db, active.id, auth.vendorId, 30);

  const metrics = [
    { label: "Orders (30d)", value: analytics.orders },
    { label: "Paid orders", value: analytics.paidOrders },
    { label: "Revenue (30d)", value: analytics.revenue },
    { label: "Avg order value", value: analytics.averageOrderValue },
    { label: "Products published", value: analytics.productsPublished },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[#111827]">Overview</h1>
          <p className="mt-1 text-sm text-[#6B7280]">
            Analytics for {active.name}. Traffic metrics are omitted until tracking is wired.
          </p>
        </div>
        <Link
          href={`/s/${active.handle}`}
          className="rounded-md border border-[#E5E7EB] px-3 py-1.5 text-xs font-semibold text-[#374151]"
          target="_blank"
        >
          View storefront
        </Link>
      </div>

      <StoreSelector stores={stores} activeId={active.id} basePath="/commerce" />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="rounded-lg border border-[#E5E7EB] bg-white p-4"
          >
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
          <p className="mt-2 text-sm text-[#6B7280]">Not available yet</p>
        </div>
        <div className="rounded-lg border border-dashed border-[#E5E7EB] bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
            Conversion rate
          </p>
          <p className="mt-2 text-sm text-[#6B7280]">Not available yet</p>
        </div>
      </div>

      <div className="rounded-lg border border-[#E5E7EB] bg-white p-4 text-sm text-[#4B5563]">
        <p className="font-medium text-[#111827]">Quick actions</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Link
            href={`/commerce/builder?storeId=${active.id}`}
            className="rounded-md bg-[#FF5A1F] px-3 py-1.5 text-xs font-semibold text-white"
          >
            Open builder
          </Link>
          <Link
            href="/marketplace/physical"
            className="rounded-md border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-semibold text-[#374151]"
          >
            Add products from marketplace
          </Link>
          <Link
            href={`/commerce/domains?storeId=${active.id}`}
            className="rounded-md border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-semibold text-[#374151]"
          >
            Domains
          </Link>
        </div>
      </div>
    </div>
  );
}
