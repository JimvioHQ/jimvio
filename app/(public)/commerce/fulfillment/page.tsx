import Link from "next/link";
import { redirect } from "next/navigation";
import {
  requireDropshippingMerchant,
  dsAdminDb,
} from "@/lib/dropshipping";
import { CommerceCard } from "@/components/commerce-os/commerce-shell";

export const dynamic = "force-dynamic";

/**
 * Fulfillment overview — uses existing merchant_store orders + sync jobs.
 * Does not replace the fulfillment router or CJ connector.
 */
export default async function CommerceFulfillmentPage() {
  const auth = await requireDropshippingMerchant();
  if (!auth.ok) {
    if (auth.status === 401) redirect("/login?next=/commerce/fulfillment");
    return <p className="text-sm text-[#4B5563]">{auth.error}</p>;
  }

  const db = dsAdminDb();
  const vendorId = auth.vendorId;

  const [pendingOrders, failedJobs, connectedStores] = await Promise.all([
    db
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("vendor_id", vendorId)
      .not("merchant_store_id", "is", null)
      .in("status", ["pending", "confirmed", "processing"]),
    db
      .from("ds_sync_jobs")
      .select("id", { count: "exact", head: true })
      .eq("vendor_id", vendorId)
      .eq("status", "failed")
      .eq("job_type", "FULFILLMENT_SYNC"),
    db
      .from("merchant_stores")
      .select("id", { count: "exact", head: true })
      .eq("vendor_id", vendorId)
      .eq("status", "connected"),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#111827]">
          Fulfillment
        </h1>
        <p className="mt-1 text-sm text-[#6B7280]">
          Channel orders route through Jimvio&apos;s fulfillment router to suppliers (including
          CJ) and push tracking back to connected stores.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <CommerceCard className="p-4">
          <p className="text-xs text-[#6B7280]">Connected stores</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">
            {connectedStores.count ?? 0}
          </p>
        </CommerceCard>
        <CommerceCard className="p-4">
          <p className="text-xs text-[#6B7280]">Open channel orders</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">
            {pendingOrders.count ?? 0}
          </p>
        </CommerceCard>
        <CommerceCard className="p-4">
          <p className="text-xs text-[#6B7280]">Failed fulfillment syncs</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">
            {failedJobs.count ?? 0}
          </p>
        </CommerceCard>
      </div>

      <CommerceCard className="p-5">
        <p className="text-sm font-semibold text-[#111827]">Actions</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/commerce/channel-orders"
            className="rounded-xl bg-[#FF5A1F] px-3 py-2 text-xs font-semibold text-white"
          >
            View channel orders
          </Link>
          <Link
            href="/commerce/sync"
            className="rounded-xl border border-[#E5E7EB] px-3 py-2 text-xs font-semibold text-[#374151]"
          >
            Sync center
          </Link>
          <Link
            href="/commerce/suppliers"
            className="rounded-xl border border-[#E5E7EB] px-3 py-2 text-xs font-semibold text-[#374151]"
          >
            Suppliers
          </Link>
        </div>
      </CommerceCard>
    </div>
  );
}
