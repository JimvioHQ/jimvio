import Link from "next/link";
import { requireDropshippingMerchant, dsAdminDb } from "@/lib/dropshipping";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DropshippingDashboardPage() {
  const auth = await requireDropshippingMerchant();
  if (!auth.ok) {
    if (auth.status === 401) redirect("/login?next=/dropshipping");
    return (
      <div className="rounded-lg border border-[#E5E7EB] bg-white p-5 text-sm text-[#4B5563]">
        {auth.error}{" "}
        <Link href="/seller/products" className="font-semibold text-[#FF5A1F]">
          Open seller dashboard
        </Link>
      </div>
    );
  }

  const db = dsAdminDb();
  const vendorId = auth.vendorId;

  const [
    storesRes,
    linksRes,
    ordersRes,
    pendingJobsRes,
    failedJobsRes,
  ] = await Promise.all([
    db
      .from("merchant_stores")
      .select("id", { count: "exact", head: true })
      .eq("vendor_id", vendorId)
      .neq("status", "disconnected"),
    db
      .from("store_product_links")
      .select("id", { count: "exact", head: true })
      .eq("vendor_id", vendorId),
    db
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("vendor_id", vendorId)
      .not("merchant_store_id", "is", null),
    db
      .from("ds_sync_jobs")
      .select("id", { count: "exact", head: true })
      .eq("vendor_id", vendorId)
      .eq("status", "pending"),
    db
      .from("ds_sync_jobs")
      .select("id", { count: "exact", head: true })
      .eq("vendor_id", vendorId)
      .eq("status", "failed"),
  ]);

  const metrics = [
    { label: "Connected stores", value: storesRes.count ?? 0, href: "/dropshipping/stores" },
    { label: "Imported products", value: linksRes.count ?? 0, href: "/dropshipping/products" },
    { label: "Store orders", value: ordersRes.count ?? 0, href: "/dropshipping/orders" },
    { label: "Pending sync jobs", value: pendingJobsRes.count ?? 0, href: "/dropshipping/sync" },
    { label: "Failed sync jobs", value: failedJobsRes.count ?? 0, href: "/dropshipping/sync" },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-[#111827]">Dashboard</h1>
        <p className="mt-1 text-sm text-[#6B7280]">
          Overview of your dropshipping stores, products, and sync health.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map((m) => (
          <Link
            key={m.label}
            href={m.href}
            className="rounded-lg border border-[#E5E7EB] bg-white p-4 transition-colors hover:border-[#FF5A1F]/40"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
              {m.label}
            </p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-[#111827]">
              {m.value}
            </p>
          </Link>
        ))}
      </div>
      <div className="rounded-lg border border-[#E5E7EB] bg-white p-4 text-sm text-[#4B5563]">
        <p className="font-medium text-[#111827]">Quick actions</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Link
            href="/dropshipping/integrations"
            className="rounded-md bg-[#FF5A1F] px-3 py-1.5 text-xs font-semibold text-white"
          >
            Connect store
          </Link>
          <Link
            href="/marketplace/physical"
            className="rounded-md border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-semibold text-[#374151]"
          >
            Browse products to sell
          </Link>
        </div>
      </div>
    </div>
  );
}
