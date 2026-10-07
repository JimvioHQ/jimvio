import Link from "next/link";
import { redirect } from "next/navigation";
import {
  requireCommerceMerchant,
  cosAdminDb,
  listVendorJimvioStores,
} from "@/lib/commerce-os";
import { CreateStoreForm } from "@/components/commerce-os/create-store-form";
import { cosTable } from "@/lib/commerce-os/db";
import { storefrontDisplayUrl } from "@/lib/commerce-os/storefront-url";
import {
  isJimvioStorePubliclyLive,
  jimvioStoreLiveLabel,
} from "@/lib/commerce-os/store-live";
import { CommerceCard } from "@/components/commerce-os/commerce-shell";
import { formatCommerceMoney, toCommerceUsd } from "@/lib/commerce-os/money";

export const dynamic = "force-dynamic";

export default async function CommerceStoresPage() {
  const auth = await requireCommerceMerchant();
  if (!auth.ok) {
    if (auth.status === 401) redirect("/login?next=/commerce/stores");
    return <p className="text-sm text-[#4B5563]">{auth.error}</p>;
  }

  const db = cosAdminDb();
  const stores = await listVendorJimvioStores(db, auth.vendorId);

  const { data: full } = await cosTable(db, "jimvio_stores")
    .select(
      "id, name, handle, logo_url, status, default_currency, published_at, created_at, primary_domain, updated_at",
    )
    .eq("vendor_id", auth.vendorId)
    .neq("status", "archived")
    .order("created_at", { ascending: false });

  const storeRows = full ?? [];
  const storeIds = storeRows.map((s) => s.id);

  const productCount = new Map<string, number>();
  const orderCount = new Map<string, number>();
  const revenueByStore = new Map<string, number>();

  if (storeIds.length) {
    const [{ data: links }, { data: paidOrders }] = await Promise.all([
      cosTable(db, "jimvio_store_products")
        .select("store_id")
        .in("store_id", storeIds)
        .eq("status", "published"),
      db
        .from("orders")
        .select("jimvio_store_id, total_amount, currency, payment_status")
        .in("jimvio_store_id", storeIds)
        .in("payment_status", ["paid", "completed"]),
    ]);
    for (const row of links ?? []) {
      if (!row.store_id) continue;
      productCount.set(row.store_id, (productCount.get(row.store_id) || 0) + 1);
    }
    for (const o of paidOrders ?? []) {
      if (!o.jimvio_store_id) continue;
      orderCount.set(
        o.jimvio_store_id,
        (orderCount.get(o.jimvio_store_id) || 0) + 1,
      );
      const prev = revenueByStore.get(o.jimvio_store_id) || 0;
      revenueByStore.set(
        o.jimvio_store_id,
        prev + toCommerceUsd(o.total_amount, o.currency),
      );
    }
  }

  if (!stores.length) {
    return (
      <div className="mx-auto max-w-lg space-y-5">
        <div>
          <h1 className="text-xl font-semibold text-[#111827]">Store</h1>
          <p className="mt-1 text-sm text-[#6B7280]">
            Create your storefront and go live on your Jimvio subdomain.
          </p>
        </div>
        <CreateStoreForm variant="hero" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[#111827]">Your store</h1>
          <p className="mt-1 text-sm text-[#6B7280]">
            Manage identity, storefront, and live status.
          </p>
        </div>
        <CreateStoreForm variant="compact" />
      </div>

      <div className="space-y-3">
        {storeRows.map((s) => {
          const live = isJimvioStorePubliclyLive(s);
          const liveUrl = storefrontDisplayUrl(s.handle);
          const products = productCount.get(s.id) || 0;
          const orders = orderCount.get(s.id) || 0;
          const revenue = revenueByStore.get(s.id) || 0;
          return (
            <CommerceCard key={s.id} className="p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  {s.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={s.logo_url}
                      alt=""
                      className="h-12 w-12 rounded-xl object-cover"
                    />
                  ) : (
                    <span className="grid h-12 w-12 place-items-center rounded-xl bg-[#FF5A1F] text-sm font-bold text-white">
                      {s.name.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-[#111827]">{s.name}</p>
                    <p className="mt-0.5 truncate text-xs text-[#6B7280]">
                      {s.handle}.jimvio.com · {s.default_currency || "USD"}
                    </p>
                    <span
                      className={
                        live
                          ? "mt-2 inline-flex rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700"
                          : "mt-2 inline-flex rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700"
                      }
                    >
                      {jimvioStoreLiveLabel(s)}
                    </span>
                    <p className="mt-2 text-xs text-[#6B7280]">
                      {products} products · {orders} paid orders ·{" "}
                      {formatCommerceMoney(revenue, "USD")}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/commerce?storeId=${s.id}`}
                    className="rounded-md border border-[#E5E7EB] px-2.5 py-1.5 text-xs font-semibold text-[#374151]"
                  >
                    Dashboard
                  </Link>
                  <Link
                    href={`/commerce/builder?storeId=${s.id}`}
                    className="rounded-md border border-[#E5E7EB] px-2.5 py-1.5 text-xs font-semibold text-[#374151]"
                  >
                    Customize
                  </Link>
                  <Link
                    href={`/commerce/settings?storeId=${s.id}`}
                    className="rounded-md border border-[#E5E7EB] px-2.5 py-1.5 text-xs font-semibold text-[#374151]"
                  >
                    Settings
                  </Link>
                  <a
                    href={liveUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md bg-[#FF5A1F] px-2.5 py-1.5 text-xs font-semibold text-white"
                  >
                    Open store
                  </a>
                </div>
              </div>
            </CommerceCard>
          );
        })}
      </div>
    </div>
  );
}
