import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Check,
  Circle,
  ExternalLink,
  Package,
  Plus,
  Settings,
  ShoppingBag,
  Wand2,
} from "lucide-react";
import {
  requireCommerceMerchant,
  cosAdminDb,
  getCommerceOverviewDashboard,
  listVendorJimvioStores,
  pickActiveStore,
} from "@/lib/commerce-os";
import { StoreSelector } from "@/components/commerce-os/store-selector";
import { CreateStoreForm } from "@/components/commerce-os/create-store-form";
import {
  CommerceCard,
} from "@/components/commerce-os/commerce-shell";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ storeId?: string; range?: string }> };

function money(amount: number, currency = "USD") {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export default async function CommerceOverviewPage({ searchParams }: Props) {
  const auth = await requireCommerceMerchant();
  if (!auth.ok) {
    if (auth.status === 401) redirect("/login?next=/commerce");
    return (
      <CommerceCard className="p-5 text-sm text-[#4B5563]">
        {auth.error}{" "}
        <Link href="/seller/products" className="font-semibold text-[#FF5A1F]">
          Open seller dashboard
        </Link>
      </CommerceCard>
    );
  }

  const { storeId, range } = await searchParams;
  const days = range === "7" ? 7 : range === "90" ? 90 : 30;
  const db = cosAdminDb();
  const stores = await listVendorJimvioStores(db, auth.vendorId);
  const active = pickActiveStore(stores, storeId);

  if (!active) {
    return (
      <div className="mx-auto max-w-xl space-y-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#111827]">
            Overview
          </h1>
          <p className="mt-1 text-sm text-[#6B7280]">
            Create a Jimvio storefront or connect Shopify to start selling.
          </p>
        </div>
        <CreateStoreForm />
        <CommerceCard className="p-5">
          <p className="text-sm font-semibold text-[#111827]">Or connect Shopify</p>
          <p className="mt-1 text-sm text-[#6B7280]">
            Publish Jimvio products to your Shopify store and ingest orders.
          </p>
          <Link
            href="/commerce/integrations"
            className="mt-3 inline-flex rounded-xl bg-[#FF5A1F] px-3 py-2 text-xs font-semibold text-white"
          >
            Connect Store
          </Link>
        </CommerceCard>
      </div>
    );
  }

  const dash = await getCommerceOverviewDashboard(
    db,
    active.id,
    auth.vendorId,
    active.handle,
    days
  );

  // Channel (Shopify / connected store) health — real counts only
  const [{ count: connectedStoreCount }, { count: failedSyncCount }] =
    await Promise.all([
      db
        .from("merchant_stores")
        .select("id", { count: "exact", head: true })
        .eq("vendor_id", auth.vendorId)
        .eq("status", "connected"),
      db
        .from("ds_sync_jobs")
        .select("id", { count: "exact", head: true })
        .eq("vendor_id", auth.vendorId)
        .eq("status", "failed"),
    ]);

  const kpis = [
    {
      label: "Total Sales",
      value: money(dash.analytics.revenue, active.default_currency || "USD"),
      hint: `${dash.analytics.paidOrders} paid`,
    },
    {
      label: "Orders",
      value: String(dash.analytics.orders),
      hint: `Last ${days} days`,
    },
    {
      label: "Customers",
      value: String(dash.analytics.customers),
      hint: "From store orders",
    },
    {
      label: "Products",
      value: String(dash.analytics.productsPublished),
      hint: "Published",
    },
  ];

  const quickActions = [
    {
      href: `/commerce/products?storeId=${active.id}`,
      label: "Add Product",
      icon: Plus,
    },
    {
      href: "/commerce/integrations",
      label: "Connect Store",
      icon: Plus,
    },
    {
      href: "/commerce/suppliers",
      label: "Add Supplier",
      icon: Package,
    },
    {
      href: `/commerce/orders?storeId=${active.id}`,
      label: "View Orders",
      icon: ShoppingBag,
    },
    {
      href: `/commerce/builder?storeId=${active.id}`,
      label: "Customize Store",
      icon: Wand2,
    },
    {
      href: `/commerce/settings?storeId=${active.id}`,
      label: "Store Settings",
      icon: Settings,
    },
  ];

  const doneCount = dash.checklist.filter((c) => c.done).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#FF5A1F]">
            Commerce OS
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#111827]">
            Overview
          </h1>
          <p className="mt-1 text-sm text-[#6B7280]">
            Manage your store, products, orders and sales.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <StoreSelector
            stores={stores}
            activeId={active.id}
            basePath="/commerce"
          />
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={
                dash.storeLive
                  ? "inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700"
                  : "inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700"
              }
            >
              {dash.storeLive ? "Active" : "Draft"}
            </span>
            <Link
              href={dash.storefrontPath}
              target="_blank"
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-xs font-semibold text-[#374151] transition hover:border-[#FF5A1F]/40"
            >
              View Store
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
            <div className="inline-flex overflow-hidden rounded-xl border border-[#E5E7EB] bg-white text-xs font-semibold">
              {[
                { d: 7, label: "7d" },
                { d: 30, label: "30d" },
                { d: 90, label: "90d" },
              ].map((opt) => (
                <Link
                  key={opt.d}
                  href={`/commerce?storeId=${active.id}&range=${opt.d}`}
                  className={
                    days === opt.d
                      ? "bg-[#FF5A1F]/10 px-3 py-2 text-[#FF5A1F]"
                      : "px-3 py-2 text-[#6B7280] hover:bg-[#F9FAFB]"
                  }
                >
                  {opt.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-5">
          {/* KPIs */}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {kpis.map((kpi) => (
              <CommerceCard key={kpi.label} className="p-4">
                <p className="text-xs font-medium text-[#6B7280]">{kpi.label}</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-[#111827]">
                  {kpi.value}
                </p>
                <p className="mt-1 text-[11px] text-[#9CA3AF]">{kpi.hint}</p>
              </CommerceCard>
            ))}
          </div>

          <CommerceCard className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-[#111827]">
                  Channel health
                </h2>
                <p className="mt-1 text-sm text-[#6B7280]">
                  Connected stores (Shopify) and sync job status.
                </p>
              </div>
              <Link
                href="/commerce/connected-stores"
                className="text-xs font-semibold text-[#FF5A1F]"
              >
                Manage channels
              </Link>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] px-4 py-3">
                <p className="text-[11px] font-medium text-[#6B7280]">
                  Connected stores
                </p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-[#111827]">
                  {connectedStoreCount ?? 0}
                </p>
              </div>
              <div className="rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] px-4 py-3">
                <p className="text-[11px] font-medium text-[#6B7280]">
                  Failed sync jobs
                </p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-[#111827]">
                  {failedSyncCount ?? 0}
                </p>
                {(failedSyncCount ?? 0) > 0 ? (
                  <Link
                    href="/commerce/sync"
                    className="mt-1 inline-flex text-[11px] font-semibold text-[#FF5A1F]"
                  >
                    Open Sync Center
                  </Link>
                ) : null}
              </div>
            </div>
          </CommerceCard>

          {/* Sales + Recent orders */}
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <CommerceCard className="p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-[#111827]">
                  Sales Overview
                </h2>
                <span className="text-[11px] text-[#9CA3AF]">Last {days} days</span>
              </div>
              {dash.analytics.revenue > 0 ? (
                <div className="mt-6">
                  <p className="text-3xl font-semibold tabular-nums text-[#111827]">
                    {money(dash.analytics.revenue, active.default_currency || "USD")}
                  </p>
                  <p className="mt-1 text-sm text-[#6B7280]">
                    {dash.analytics.paidOrders} paid order
                    {dash.analytics.paidOrders === 1 ? "" : "s"} · AOV{" "}
                    {money(
                      dash.analytics.averageOrderValue,
                      active.default_currency || "USD"
                    )}
                  </p>
                </div>
              ) : (
                <div className="mt-8 flex flex-col items-center justify-center py-8 text-center">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#F3F4F6]">
                    <Package className="h-5 w-5 text-[#9CA3AF]" />
                  </div>
                  <p className="text-sm font-medium text-[#111827]">No sales data yet</p>
                  <p className="mt-1 max-w-xs text-sm text-[#6B7280]">
                    Start selling to see your sales performance here.
                  </p>
                </div>
              )}
            </CommerceCard>

            <CommerceCard className="flex flex-col p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-[#111827]">
                  Recent Orders
                </h2>
                <Link
                  href={`/commerce/orders?storeId=${active.id}`}
                  className="text-xs font-semibold text-[#FF5A1F]"
                >
                  View Orders
                </Link>
              </div>
              {!dash.recentOrders.length ? (
                <div className="mt-6 flex flex-1 flex-col items-center justify-center py-6 text-center">
                  <p className="text-sm font-medium text-[#111827]">No orders yet</p>
                  <p className="mt-1 text-sm text-[#6B7280]">
                    When customers place orders, they&apos;ll appear here.
                  </p>
                </div>
              ) : (
                <ul className="mt-4 divide-y divide-[#F3F4F6]">
                  {dash.recentOrders.map((o) => (
                    <li
                      key={o.id}
                      className="flex items-center justify-between gap-3 py-2.5 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-[#111827]">
                          {o.order_number || o.id.slice(0, 8)}
                        </p>
                        <p className="text-[11px] text-[#9CA3AF]">
                          {new Date(o.created_at).toLocaleDateString()} ·{" "}
                          {o.payment_status || o.status}
                        </p>
                      </div>
                      <p className="shrink-0 tabular-nums font-medium text-[#111827]">
                        {money(
                          Number(o.total_amount || 0),
                          o.currency || active.default_currency || "USD"
                        )}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CommerceCard>
          </div>

          {/* Top products / collections / traffic */}
          <div className="grid gap-5 md:grid-cols-3">
            <CommerceCard className="p-5">
              <h2 className="text-sm font-semibold text-[#111827]">Top Products</h2>
              {!dash.topProducts.length ? (
                <p className="mt-6 text-sm text-[#6B7280]">
                  No products yet. Add a product to start selling.
                </p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {dash.topProducts.slice(0, 4).map((p) => (
                    <li key={p.id} className="flex items-center gap-3">
                      <div className="relative h-10 w-10 overflow-hidden rounded-lg bg-[#F3F4F6]">
                        {p.image ? (
                          <Image
                            src={p.image}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="40px"
                          />
                        ) : (
                          <Package className="m-2.5 h-5 w-5 text-[#9CA3AF]" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[#111827]">
                          {p.name}
                        </p>
                        <p className="text-[11px] text-[#9CA3AF]">{p.soldLabel}</p>
                      </div>
                      <p className="shrink-0 text-sm tabular-nums text-[#374151]">
                        {money(p.price, p.currency)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CommerceCard>

            <CommerceCard className="p-5">
              <h2 className="text-sm font-semibold text-[#111827]">
                Top Collections
              </h2>
              {dash.analytics.collections > 0 ? (
                <div className="mt-6">
                  <p className="text-3xl font-semibold tabular-nums text-[#111827]">
                    {dash.analytics.collections}
                  </p>
                  <p className="mt-1 text-sm text-[#6B7280]">
                    Collection{dash.analytics.collections === 1 ? "" : "s"} on this
                    store
                  </p>
                  <Link
                    href={`/commerce/collections?storeId=${active.id}`}
                    className="mt-4 inline-flex text-xs font-semibold text-[#FF5A1F]"
                  >
                    Manage collections
                  </Link>
                </div>
              ) : (
                <div className="mt-6">
                  <p className="text-sm text-[#6B7280]">
                    No collections yet. Create collections to organize your products.
                  </p>
                  <Link
                    href={`/commerce/collections?storeId=${active.id}`}
                    className="mt-4 inline-flex rounded-xl bg-[#FF5A1F] px-3 py-2 text-xs font-semibold text-white"
                  >
                    Create Collection
                  </Link>
                </div>
              )}
            </CommerceCard>

            <CommerceCard className="p-5">
              <h2 className="text-sm font-semibold text-[#111827]">
                Traffic Sources
              </h2>
              <div className="mt-6 flex flex-col items-center justify-center py-4 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full border-8 border-[#F3F4F6]">
                  <span className="text-xs font-semibold text-[#9CA3AF]">—</span>
                </div>
                <p className="mt-4 text-sm font-medium text-[#111827]">
                  Not tracked yet
                </p>
                <p className="mt-1 text-[11px] text-[#6B7280]">
                  Visitor analytics will appear once storefront tracking is enabled.
                </p>
              </div>
            </CommerceCard>
          </div>

          {/* Quick actions */}
          <CommerceCard className="p-5">
            <h2 className="text-sm font-semibold text-[#111827]">Quick Actions</h2>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {quickActions.map((a) => (
                <Link
                  key={a.label}
                  href={a.href}
                  className="flex flex-col items-center gap-2 rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] px-2 py-4 text-center transition hover:border-[#FF5A1F]/40 hover:bg-white"
                >
                  <a.icon className="h-5 w-5 text-[#FF5A1F]" strokeWidth={1.75} />
                  <span className="text-[11px] font-semibold leading-tight text-[#374151]">
                    {a.label}
                  </span>
                </Link>
              ))}
            </div>
          </CommerceCard>
        </div>

        {/* Right rail */}
        <aside className="space-y-4">
          <CommerceCard className="p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-[#111827]">Store Status</h2>
              <span
                className={
                  dash.storeLive
                    ? "text-[11px] font-semibold text-emerald-600"
                    : "text-[11px] font-semibold text-amber-600"
                }
              >
                {dash.storeLive ? "Active" : "Draft"}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-[#9CA3AF]">
              {doneCount}/{dash.checklist.length} setup steps complete
            </p>
            <Link
              href={dash.storefrontPath}
              target="_blank"
              className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#FF5A1F] px-3 py-2.5 text-xs font-semibold text-white"
            >
              View Store
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
            <ul className="mt-4 space-y-2.5">
              {dash.checklist.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className="flex items-center gap-2.5 rounded-xl px-1 py-1 text-sm transition hover:bg-[#F8FAFC]"
                  >
                    {item.done ? (
                      <Check className="h-4 w-4 shrink-0 text-emerald-600" />
                    ) : (
                      <Circle className="h-4 w-4 shrink-0 text-[#D1D5DB]" />
                    )}
                    <span
                      className={
                        item.done
                          ? "text-[#6B7280] line-through decoration-[#D1D5DB]"
                          : "font-medium text-[#111827]"
                      }
                    >
                      {item.label}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </CommerceCard>

          <CommerceCard className="p-5">
            <h2 className="text-sm font-semibold text-[#111827]">Latest Activity</h2>
            {!dash.recentOrders.length ? (
              <p className="mt-4 text-sm text-[#6B7280]">
                No recent activity. Orders and product updates will show here.
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {dash.recentOrders.slice(0, 4).map((o) => (
                  <li key={`act-${o.id}`} className="text-sm">
                    <p className="font-medium text-[#111827]">
                      Order {o.order_number || o.id.slice(0, 8)}
                    </p>
                    <p className="text-[11px] text-[#9CA3AF]">
                      {o.payment_status || o.status} ·{" "}
                      {new Date(o.created_at).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CommerceCard>

          <div className="rounded-2xl bg-gradient-to-br from-[#FF5A1F] to-[#FF8A4C] p-5 text-white shadow-[0_8px_24px_rgba(255,90,31,0.25)]">
            <p className="text-sm font-semibold">Upgrade Your Plan</p>
            <p className="mt-1 text-xs text-white/90">
              Unlock more stores, staff seats, and advanced analytics when you&apos;re
              ready.
            </p>
            <Link
              href="/pricing"
              className="mt-4 inline-flex rounded-xl bg-white px-3 py-2 text-xs font-semibold text-[#FF5A1F]"
            >
              View Plans
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
