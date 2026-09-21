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
  Truck,
  Wand2,
  Wallet,
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
import { CommerceCard } from "@/components/commerce-os/commerce-shell";
import { ensureWallet } from "@/lib/wallet-os/ensure";
import { PLATFORM_CURRENCY } from "@/lib/currency/platform";

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
            Create a native Jimvio storefront to start selling. Customers shop on
            your branded store — not a third-party channel.
          </p>
        </div>
        <CreateStoreForm />
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

  const wallet = await ensureWallet(auth.userId);
  const currency = active.default_currency || PLATFORM_CURRENCY;
  const available = Number(wallet.available_balance ?? 0);
  const pending = Number(wallet.pending_balance ?? 0);
  const pipeline = dash.analytics.pipeline;
  const fulfillment = dash.analytics.fulfillment;

  const kpis = [
    {
      label: "Gross Sales",
      value: money(dash.analytics.revenue, currency),
      hint: `${dash.analytics.paidOrders} paid`,
    },
    {
      label: "Paid Orders",
      value: String(dash.analytics.paidOrders),
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
    {
      label: "Pending Fulfillment",
      value: String(dash.analytics.pendingFulfillment ?? 0),
      hint: "Paid, not shipped",
    },
    {
      label: "Available Balance",
      value: money(available, PLATFORM_CURRENCY),
      hint: `Pending ${money(pending, PLATFORM_CURRENCY)}`,
    },
  ];

  const pipelineItems = [
    { label: "Pending payment", value: pipeline?.pendingPayment ?? 0 },
    { label: "Paid", value: pipeline?.paid ?? 0 },
    { label: "Processing", value: pipeline?.processing ?? 0 },
    { label: "Shipped", value: pipeline?.shipped ?? 0 },
    { label: "Delivered", value: pipeline?.delivered ?? 0 },
    { label: "Refunded", value: pipeline?.refunded ?? 0 },
  ];

  const fulfillmentItems = [
    { label: "CJ orders", value: fulfillment?.cjOrders ?? 0 },
    { label: "Processing", value: fulfillment?.processing ?? 0 },
    { label: "Shipped", value: fulfillment?.shipped ?? 0 },
    { label: "Tracking available", value: fulfillment?.trackingAvailable ?? 0 },
    {
      label: "Exceptions",
      value: fulfillment?.fulfillmentExceptions ?? 0,
    },
  ];

  const quickActions = [
    {
      href: `/commerce/products?storeId=${active.id}`,
      label: "Add Product",
      icon: Plus,
    },
    {
      href: `/commerce/orders?storeId=${active.id}`,
      label: "View Orders",
      icon: ShoppingBag,
    },
    {
      href: `/commerce/fulfillment?storeId=${active.id}`,
      label: "Fulfillment",
      icon: Truck,
    },
    {
      href: `/commerce/finance?storeId=${active.id}`,
      label: "Finance",
      icon: Wallet,
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
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#FF5A1F]">
            Commerce OS
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#111827]">
            Overview
          </h1>
          <p className="mt-1 text-sm text-[#6B7280]">
            Native store operations — sales, fulfillment, and earnings.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <StoreSelector stores={stores} activeId={active.id} basePath="/commerce" />
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={
                dash.storeLive
                  ? "inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700"
                  : "inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700"
              }
            >
              {dash.storeLive ? "Online" : "Offline"}
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
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
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

          <div className="grid gap-5 lg:grid-cols-2">
            <CommerceCard className="p-5">
              <h2 className="text-sm font-semibold text-[#111827]">Sales performance</h2>
              {dash.analytics.revenue > 0 ? (
                <div className="mt-6">
                  <p className="text-3xl font-semibold tabular-nums text-[#111827]">
                    {money(dash.analytics.revenue, currency)}
                  </p>
                  <p className="mt-1 text-sm text-[#6B7280]">
                    {dash.analytics.paidOrders} paid order
                    {dash.analytics.paidOrders === 1 ? "" : "s"} · AOV{" "}
                    {money(dash.analytics.averageOrderValue, currency)}
                  </p>
                </div>
              ) : (
                <div className="mt-8 flex flex-col items-center justify-center py-8 text-center">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#F3F4F6]">
                    <Package className="h-5 w-5 text-[#9CA3AF]" />
                  </div>
                  <p className="text-sm font-medium text-[#111827]">No sales yet</p>
                  <p className="mt-1 max-w-xs text-sm text-[#6B7280]">
                    After your first paid order, gross sales and AOV appear here.
                  </p>
                </div>
              )}
            </CommerceCard>

            <CommerceCard className="p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-[#111827]">Financial summary</h2>
                <Link
                  href={`/commerce/finance?storeId=${active.id}`}
                  className="text-xs font-semibold text-[#FF5A1F]"
                >
                  Open finance
                </Link>
              </div>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-[#6B7280]">Gross sales</dt>
                  <dd className="tabular-nums font-medium text-[#111827]">
                    {money(dash.analytics.revenue, currency)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[#6B7280]">Pending balance</dt>
                  <dd className="tabular-nums font-medium text-[#111827]">
                    {money(pending, PLATFORM_CURRENCY)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[#6B7280]">Available balance</dt>
                  <dd className="tabular-nums font-semibold text-[#111827]">
                    {money(available, PLATFORM_CURRENCY)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[#6B7280]">Lifetime earned</dt>
                  <dd className="tabular-nums font-medium text-[#111827]">
                    {money(Number(wallet.total_earned ?? 0), PLATFORM_CURRENCY)}
                  </dd>
                </div>
              </dl>
              <p className="mt-3 text-[11px] text-[#9CA3AF]">
                Balances come from the wallet ledger — not estimated UI totals.
              </p>
            </CommerceCard>
          </div>

          <CommerceCard className="p-5">
            <h2 className="text-sm font-semibold text-[#111827]">Order pipeline</h2>
            <div className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {pipelineItems.map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] px-3 py-3"
                >
                  <p className="text-[11px] text-[#6B7280]">{item.label}</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums text-[#111827]">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </CommerceCard>

          <CommerceCard className="p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-[#111827]">
                Fulfillment health
              </h2>
              <Link
                href={`/commerce/fulfillment?storeId=${active.id}`}
                className="text-xs font-semibold text-[#FF5A1F]"
              >
                View fulfillment
              </Link>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              {fulfillmentItems.map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] px-3 py-3"
                >
                  <p className="text-[11px] text-[#6B7280]">{item.label}</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums text-[#111827]">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
            {(fulfillment?.cjOrders ?? 0) === 0 &&
            (dash.analytics.paidOrders ?? 0) === 0 ? (
              <p className="mt-3 text-sm text-[#6B7280]">
                CJ orders and tracking appear after a paid native-store order is
                submitted to the supplier.
              </p>
            ) : null}
          </CommerceCard>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <CommerceCard className="flex flex-col p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-[#111827]">Recent orders</h2>
                <Link
                  href={`/commerce/orders?storeId=${active.id}`}
                  className="text-xs font-semibold text-[#FF5A1F]"
                >
                  View orders
                </Link>
              </div>
              {!dash.recentOrders.length ? (
                <div className="mt-6 flex flex-1 flex-col items-center justify-center py-6 text-center">
                  <p className="text-sm font-medium text-[#111827]">No orders yet</p>
                  <p className="mt-1 text-sm text-[#6B7280]">
                    When customers place orders on your store, they appear here.
                  </p>
                </div>
              ) : (
                <ul className="mt-4 divide-y divide-[#F3F4F6]">
                  {dash.recentOrders.map((o) => (
                    <li key={o.id}>
                      <Link
                        href={`/commerce/orders/${o.id}?storeId=${active.id}`}
                        className="flex items-center justify-between gap-3 py-2.5 text-sm transition hover:bg-[#F8FAFC]"
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
                            o.currency || currency
                          )}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CommerceCard>

            <CommerceCard className="p-5">
              <h2 className="text-sm font-semibold text-[#111827]">Top products</h2>
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
                      </div>
                      <p className="shrink-0 text-sm tabular-nums text-[#374151]">
                        {money(p.price, p.currency)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CommerceCard>
          </div>

          <CommerceCard className="p-5">
            <h2 className="text-sm font-semibold text-[#111827]">Quick actions</h2>
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

        <aside className="space-y-4">
          <CommerceCard className="p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-[#111827]">Store status</h2>
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
            <h2 className="text-sm font-semibold text-[#111827]">Recent activity</h2>
            {!dash.recentOrders.length ? (
              <p className="mt-4 text-sm text-[#6B7280]">
                No recent activity. Orders will show here after checkout.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {dash.recentOrders.slice(0, 5).map((o) => (
                  <li key={o.id} className="text-sm">
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
        </aside>
      </div>
    </div>
  );
}
