import Link from "next/link";
import { redirect } from "next/navigation";
import { ExternalLink, Package } from "lucide-react";
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
import { createServiceRoleClient } from "@/lib/supabase/service-role";

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
      <div className="mx-auto max-w-lg space-y-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-[#111827]">
            Overview
          </h1>
          <p className="mt-1 text-sm text-[#6B7280]">
            Create a storefront to start selling on your branded domain.
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

  const service = createServiceRoleClient();
  const { data: recentTx } = await service
    .from("transactions")
    .select("id, amount, currency, status, type, reference, created_at")
    .eq("user_id", auth.userId)
    .eq("type", "vendor_earning")
    .order("created_at", { ascending: false })
    .limit(5);

  const kpis = [
    {
      label: "Gross Sales",
      value: money(dash.analytics.revenue, currency),
      hint: `${dash.analytics.paidOrders} paid orders`,
    },
    {
      label: "Paid Orders",
      value: String(dash.analytics.paidOrders),
      hint: `Last ${days} days`,
    },
    {
      label: "Customers",
      value: String(dash.analytics.customers),
      hint: "Store customers",
    },
    {
      label: "Products",
      value: String(dash.analytics.productsPublished),
      hint: "Published",
    },
    {
      label: "Available Balance",
      value: money(available, PLATFORM_CURRENCY),
      hint: "Ready for payout",
    },
  ];

  const pipelineItems = [
    {
      label: "Pending payment",
      value: pipeline?.pendingPayment ?? 0,
      href: `/commerce/orders?storeId=${active.id}&status=pending`,
    },
    {
      label: "Paid",
      value: (pipeline?.paid ?? 0) + (pipeline?.processing ?? 0),
      href: `/commerce/orders?storeId=${active.id}&status=paid`,
    },
    {
      label: "Processing",
      value: pipeline?.processing ?? 0,
      href: `/commerce/orders?storeId=${active.id}&status=paid`,
    },
    {
      label: "Shipped",
      value: pipeline?.shipped ?? 0,
      href: `/commerce/orders?storeId=${active.id}&status=shipped`,
    },
    {
      label: "Delivered",
      value: pipeline?.delivered ?? 0,
      href: `/commerce/orders?storeId=${active.id}&status=delivered`,
    },
    {
      label: "Refunded",
      value: pipeline?.refunded ?? 0,
      href: `/commerce/orders?storeId=${active.id}&status=refunded`,
    },
  ];

  const fulfillmentItems = [
    {
      label: "Awaiting",
      value: dash.analytics.pendingFulfillment ?? 0,
    },
    { label: "Processing", value: fulfillment?.processing ?? 0 },
    { label: "Shipped", value: fulfillment?.shipped ?? 0 },
    { label: "Tracking", value: fulfillment?.trackingAvailable ?? 0 },
    { label: "Exceptions", value: fulfillment?.fulfillmentExceptions ?? 0 },
  ];

  const setupIncomplete = dash.checklist.some((c) => !c.done);

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-[#111827]">
            Overview
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StoreSelector stores={stores} activeId={active.id} basePath="/commerce" />
          <span
            className={
              dash.storeLive
                ? "inline-flex items-center rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700"
                : "inline-flex items-center rounded-md bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700"
            }
          >
            {dash.storeLive ? "Online" : "Offline"}
          </span>
          <Link
            href={dash.storefrontPath}
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#374151] transition hover:border-[#FF5A1F]/40"
          >
            View Store
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
          <div className="inline-flex overflow-hidden rounded-lg border border-[#E5E7EB] bg-white text-xs font-semibold">
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
                    ? "bg-[#FF5A1F]/10 px-2.5 py-1.5 text-[#FF5A1F]"
                    : "px-2.5 py-1.5 text-[#6B7280] hover:bg-[#F9FAFB]"
                }
              >
                {opt.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {setupIncomplete ? (
        <CommerceCard className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <p className="text-sm text-[#4B5563]">
            Finish store setup to go live —{" "}
            {dash.checklist.filter((c) => c.done).length}/{dash.checklist.length}{" "}
            complete.
          </p>
          <Link
            href={`/commerce/stores?storeId=${active.id}`}
            className="text-xs font-semibold text-[#FF5A1F]"
          >
            Continue setup
          </Link>
        </CommerceCard>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {kpis.map((kpi) => (
          <CommerceCard key={kpi.label} className="px-4 py-3.5">
            <p className="text-[11px] font-medium text-[#6B7280]">{kpi.label}</p>
            <p className="mt-1.5 text-xl font-semibold tabular-nums tracking-tight text-[#111827]">
              {kpi.value}
            </p>
            <p className="mt-0.5 text-[11px] text-[#9CA3AF]">{kpi.hint}</p>
          </CommerceCard>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <CommerceCard className="p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-[#111827]">Sales performance</h2>
            <span className="text-[11px] text-[#9CA3AF]">Last {days} days</span>
          </div>
          {dash.analytics.revenue > 0 ? (
            <div className="mt-4">
              <p className="text-2xl font-semibold tabular-nums text-[#111827]">
                {money(dash.analytics.revenue, currency)}
              </p>
              <p className="mt-1 text-sm text-[#6B7280]">
                {dash.analytics.paidOrders} paid · AOV{" "}
                {money(dash.analytics.averageOrderValue, currency)}
              </p>
            </div>
          ) : (
            <div className="mt-4 flex items-start gap-3 rounded-lg bg-[#F8FAFC] px-3 py-3">
              <Package className="mt-0.5 h-4 w-4 shrink-0 text-[#9CA3AF]" />
              <div>
                <p className="text-sm font-medium text-[#111827]">No sales yet</p>
                <p className="mt-0.5 text-[12px] text-[#6B7280]">
                  Start selling to see revenue performance.
                </p>
              </div>
            </div>
          )}
        </CommerceCard>

        <CommerceCard className="p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-[#111827]">Financial summary</h2>
            <Link
              href={`/commerce/finance?storeId=${active.id}`}
              className="text-xs font-semibold text-[#FF5A1F]"
            >
              Revenue →
            </Link>
          </div>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-[#6B7280]">Gross sales</dt>
              <dd className="tabular-nums font-medium">
                {money(dash.analytics.revenue, currency)}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[#6B7280]">Pending</dt>
              <dd className="tabular-nums font-medium">
                {money(pending, PLATFORM_CURRENCY)}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[#6B7280]">Available</dt>
              <dd className="tabular-nums font-semibold">
                {money(available, PLATFORM_CURRENCY)}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[#6B7280]">Lifetime earned</dt>
              <dd className="tabular-nums font-medium">
                {money(Number(wallet.total_earned ?? 0), PLATFORM_CURRENCY)}
              </dd>
            </div>
          </dl>
        </CommerceCard>
      </div>

      <CommerceCard className="p-4">
        <h2 className="text-sm font-semibold text-[#111827]">Order pipeline</h2>
        <div className="mt-3 grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          {pipelineItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] px-3 py-2.5 transition hover:border-[#FF5A1F]/35 hover:bg-white"
            >
              <p className="text-[11px] text-[#6B7280]">{item.label}</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-[#111827]">
                {item.value}
              </p>
            </Link>
          ))}
        </div>
      </CommerceCard>

      <CommerceCard className="p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-[#111827]">Fulfillment</h2>
          <Link
            href={`/commerce/fulfillment?storeId=${active.id}`}
            className="text-xs font-semibold text-[#FF5A1F]"
          >
            View all →
          </Link>
        </div>
        <div className="mt-3 grid gap-2 grid-cols-2 sm:grid-cols-5">
          {fulfillmentItems.map((item) => (
            <div
              key={item.label}
              className="rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] px-3 py-2.5"
            >
              <p className="text-[11px] text-[#6B7280]">{item.label}</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-[#111827]">
                {item.value}
              </p>
            </div>
          ))}
        </div>
        {(dash.analytics.paidOrders ?? 0) === 0 ? (
          <p className="mt-3 text-[12px] text-[#6B7280]">
            No fulfillment activity yet.
          </p>
        ) : null}
      </CommerceCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <CommerceCard className="p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-[#111827]">Recent orders</h2>
            <Link
              href={`/commerce/orders?storeId=${active.id}`}
              className="text-xs font-semibold text-[#FF5A1F]"
            >
              View all orders →
            </Link>
          </div>
          {!dash.recentOrders.length ? (
            <p className="mt-3 text-[13px] text-[#6B7280]">
              No orders yet. When customers place orders, they will appear here.
            </p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[420px] text-left text-sm">
                <thead className="text-[10px] uppercase tracking-wide text-[#9CA3AF]">
                  <tr>
                    <th className="pb-2 font-medium">Order</th>
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium">Payment</th>
                    <th className="pb-2 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F3F4F6]">
                  {dash.recentOrders.map((o) => (
                    <tr key={o.id}>
                      <td className="py-2">
                        <Link
                          href={`/commerce/orders/${o.id}?storeId=${active.id}`}
                          className="font-medium text-[#111827] hover:text-[#FF5A1F]"
                        >
                          {o.order_number || o.id.slice(0, 8)}
                        </Link>
                      </td>
                      <td className="py-2 text-[#6B7280]">
                        {new Date(o.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-2 text-[#6B7280]">
                        {o.payment_status || "—"}
                      </td>
                      <td className="py-2 text-right tabular-nums font-medium">
                        {money(
                          Number(o.total_amount || 0),
                          o.currency || currency
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CommerceCard>

        <CommerceCard className="p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-[#111827]">
              Recent transactions
            </h2>
            <Link
              href={`/commerce/finance?storeId=${active.id}&tab=transactions`}
              className="text-xs font-semibold text-[#FF5A1F]"
            >
              View ledger →
            </Link>
          </div>
          {!(recentTx ?? []).length ? (
            <p className="mt-3 text-[13px] text-[#6B7280]">No transactions yet.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[420px] text-left text-sm">
                <thead className="text-[10px] uppercase tracking-wide text-[#9CA3AF]">
                  <tr>
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium">Reference</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F3F4F6]">
                  {(recentTx ?? []).map((tx) => (
                    <tr key={tx.id}>
                      <td className="py-2 text-[#6B7280]">
                        {new Date(tx.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-2 font-medium text-[#111827]">
                        {tx.reference || tx.id.slice(0, 8)}
                      </td>
                      <td className="py-2 text-[#6B7280]">{tx.status}</td>
                      <td className="py-2 text-right tabular-nums font-medium">
                        {money(
                          Number(tx.amount || 0),
                          tx.currency || PLATFORM_CURRENCY
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CommerceCard>
      </div>
    </div>
  );
}
