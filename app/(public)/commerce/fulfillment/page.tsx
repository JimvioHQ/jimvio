import Link from "next/link";
import { redirect } from "next/navigation";
import {
  requireCommerceMerchant,
  cosAdminDb,
  listVendorJimvioStores,
  pickActiveStore,
} from "@/lib/commerce-os";
import { StoreSelector } from "@/components/commerce-os/store-selector";
import { CommerceCard } from "@/components/commerce-os/commerce-shell";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ storeId?: string }> };

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

  const vendorId = auth.vendorId;
  const storeFilter = active.id;

  const [pendingPaid, networkLinked, tracking, exceptions] = await Promise.all([
    db
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("vendor_id", vendorId)
      .eq("jimvio_store_id", storeFilter)
      .in("payment_status", ["paid", "completed"])
      .in("status", ["confirmed", "processing", "paid"]),
    db
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("vendor_id", vendorId)
      .eq("jimvio_store_id", storeFilter)
      .not("cj_order_id", "is", null),
    db
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("vendor_id", vendorId)
      .eq("jimvio_store_id", storeFilter)
      .not("tracking_number", "is", null),
    db
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("vendor_id", vendorId)
      .eq("jimvio_store_id", storeFilter)
      .eq("status", "fulfillment_exception"),
  ]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#111827]">
            Fulfillment
          </h1>
          <p className="mt-1 text-sm text-[#6B7280]">
            Paid orders are processed automatically — shipment and tracking
            update as fulfillment progresses.
          </p>
        </div>
        <StoreSelector
          stores={stores}
          activeId={active.id}
          basePath="/commerce/fulfillment"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <CommerceCard className="p-4">
          <p className="text-xs text-[#6B7280]">Pending fulfillment</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">
            {pendingPaid.count ?? 0}
          </p>
        </CommerceCard>
        <CommerceCard className="p-4">
          <p className="text-xs text-[#6B7280]">In network</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">
            {networkLinked.count ?? 0}
          </p>
        </CommerceCard>
        <CommerceCard className="p-4">
          <p className="text-xs text-[#6B7280]">Tracking available</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">
            {tracking.count ?? 0}
          </p>
        </CommerceCard>
        <CommerceCard className="p-4">
          <p className="text-xs text-[#6B7280]">Exceptions</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">
            {exceptions.count ?? 0}
          </p>
        </CommerceCard>
      </div>

      <CommerceCard className="p-5">
        <p className="text-sm font-semibold text-[#111827]">Actions</p>
        <p className="mt-1 text-sm text-[#6B7280]">
          Open paid orders to review fulfillment and tracking status.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href={`/commerce/orders?storeId=${active.id}`}
            className="rounded-xl bg-[#FF5A1F] px-3 py-2 text-xs font-semibold text-white"
          >
            Store orders
          </Link>
          <Link
            href={`/commerce/suppliers?storeId=${active.id}`}
            className="rounded-xl border border-[#E5E7EB] px-3 py-2 text-xs font-semibold text-[#374151]"
          >
            Fulfillment network
          </Link>
        </div>
      </CommerceCard>
    </div>
  );
}
