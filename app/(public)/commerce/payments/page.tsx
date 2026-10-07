import Link from "next/link";
import { redirect } from "next/navigation";
import {
  requireCommerceMerchant,
  cosAdminDb,
  listVendorJimvioStores,
  pickActiveStore,
  formatCommerceMoney,
  toCommerceUsd,
} from "@/lib/commerce-os";
import { StoreSelector } from "@/components/commerce-os/store-selector";
import {
  CommerceCard,
  CommerceEmptyState,
} from "@/components/commerce-os/commerce-shell";
import { CommerceStatusBadge } from "@/components/commerce-os/commerce-status-badge";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ storeId?: string; q?: string; status?: string }>;
};

function paymentTone(status: string | null | undefined) {
  const s = (status || "").toLowerCase();
  if (s === "paid" || s === "completed" || s === "success") {
    return { label: "Successful", tone: "success" as const };
  }
  if (s === "refunded") return { label: "Refunded", tone: "neutral" as const };
  if (s === "failed") return { label: "Failed", tone: "danger" as const };
  if (s === "cancelled") return { label: "Cancelled", tone: "danger" as const };
  if (s === "processing") return { label: "Processing", tone: "info" as const };
  return { label: "Pending", tone: "warning" as const };
}

function providerLabel(meta: Record<string, unknown> | null, fallback?: string | null) {
  const raw =
    (typeof meta?.payment_provider === "string" && meta.payment_provider) ||
    (typeof meta?.provider === "string" && meta.provider) ||
    fallback ||
    "";
  const p = String(raw).toLowerCase();
  if (p.includes("flutterwave") || p === "card" || p === "cards") return "Flutterwave";
  if (p.includes("momo") || p.includes("mobile")) return "Mobile Money";
  if (p.includes("nowpay") || p.includes("crypto")) return "NOWPayments";
  if (p.includes("binance")) return "Binance Pay";
  if (raw) return String(raw);
  return "Checkout";
}

const PROVIDERS = [
  {
    name: "Flutterwave",
    methods: "Cards / Mobile Money",
    status: "Connected",
  },
  {
    name: "Mobile Money",
    methods: "MTN / Airtel via Flutterwave",
    status: "Connected",
  },
  {
    name: "NOWPayments",
    methods: "Crypto",
    status: "Connected",
  },
  {
    name: "Binance Pay",
    methods: "Binance Pay",
    status: "Connected",
  },
] as const;

export default async function CommercePaymentsPage({ searchParams }: Props) {
  const auth = await requireCommerceMerchant();
  if (!auth.ok) {
    if (auth.status === 401) redirect("/login?next=/commerce/payments");
    return <p className="text-sm text-[#4B5563]">{auth.error}</p>;
  }

  const { storeId, q, status } = await searchParams;
  const db = cosAdminDb();
  const stores = await listVendorJimvioStores(db, auth.vendorId);
  const active = pickActiveStore(stores, storeId);

  if (!active) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-semibold text-[#111827]">Payments</h1>
        <Link href="/commerce/stores" className="text-sm font-semibold text-[#FF5A1F]">
          Create a store
        </Link>
      </div>
    );
  }

  const { data: orders } = await db
    .from("orders")
    .select(
      "id, order_number, total_amount, currency, payment_status, created_at, paid_at, buyer_id, metadata",
    )
    .eq("jimvio_store_id", active.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const orderList = orders ?? [];
  const orderIds = orderList.map((o) => o.id);

  const txByOrder = new Map<
    string,
    { id: string; reference: string | null; status: string | null; provider?: string }
  >();
  let webhookEvents: Array<{
    id: string;
    provider: string;
    status: string;
    error: string | null;
    order_id: string | null;
    idempotency_key: string;
    created_at: string;
    updated_at: string;
  }> = [];
  if (orderIds.length) {
    const [{ data: txs }, { data: hooks }] = await Promise.all([
      db
        .from("transactions")
        .select("id, order_id, reference, status, metadata, created_at")
        .in("order_id", orderIds)
        .order("created_at", { ascending: false })
        .limit(200),
      db
        .from("webhook_events")
        .select(
          "id, provider, status, error, order_id, idempotency_key, created_at, updated_at",
        )
        .in("order_id", orderIds)
        .order("created_at", { ascending: false })
        .limit(40),
    ]);
    for (const tx of txs ?? []) {
      if (!tx.order_id || txByOrder.has(tx.order_id)) continue;
      const meta =
        tx.metadata && typeof tx.metadata === "object" && !Array.isArray(tx.metadata)
          ? (tx.metadata as Record<string, unknown>)
          : null;
      txByOrder.set(tx.order_id, {
        id: tx.id,
        reference: tx.reference,
        status: tx.status,
        provider:
          typeof meta?.provider === "string" ? meta.provider : undefined,
      });
    }
    webhookEvents = (hooks ?? []).filter((h) => {
      const p = String(h.provider || "").toLowerCase();
      return !(
        p.includes("paypal") ||
        p.includes("pesa") ||
        p.includes("afripay") ||
        p.includes("pawa")
      );
    });
  }

  const buyerIds = Array.from(
    new Set(orderList.map((o) => o.buyer_id).filter(Boolean) as string[]),
  );
  const profileById = new Map<string, string>();
  if (buyerIds.length) {
    const { data: profiles } = await db
      .from("profiles")
      .select("id, email, full_name")
      .in("id", buyerIds);
    for (const p of profiles ?? []) {
      profileById.set(p.id, p.email || p.full_name || p.id.slice(0, 8));
    }
  }

  const rows = orderList.map((o) => {
    const meta =
      o.metadata && typeof o.metadata === "object" && !Array.isArray(o.metadata)
        ? (o.metadata as Record<string, unknown>)
        : null;
    const tx = txByOrder.get(o.id);
    const badge = paymentTone(o.payment_status);
    return {
      id: o.id,
      orderNumber: o.order_number || o.id.slice(0, 8),
      customer: o.buyer_id ? profileById.get(o.buyer_id) || "Customer" : "Guest",
      provider: providerLabel(meta, tx?.provider),
      amount: Number(o.total_amount || 0),
      currency: o.currency || "USD",
      status: badge,
      date: o.created_at,
      reference: tx?.reference || o.order_number || o.id.slice(0, 8),
      paymentStatus: (o.payment_status || "").toLowerCase(),
    };
  });

  const needle = (q || "").trim().toLowerCase();
  const statusFilter = (status || "all").toLowerCase();
  const filtered = rows.filter((r) => {
    if (statusFilter === "successful" && r.status.label !== "Successful") return false;
    if (statusFilter === "pending" && r.status.label !== "Pending") return false;
    if (statusFilter === "failed" && r.status.label !== "Failed") return false;
    if (statusFilter === "refunded" && r.status.label !== "Refunded") return false;
    if (!needle) return true;
    return (
      r.orderNumber.toLowerCase().includes(needle) ||
      r.customer.toLowerCase().includes(needle) ||
      r.reference.toLowerCase().includes(needle) ||
      r.provider.toLowerCase().includes(needle)
    );
  });

  const volume = rows.reduce(
    (s, r) =>
      r.status.label === "Successful"
        ? s + toCommerceUsd(r.amount, r.currency)
        : s,
    0,
  );
  const successful = rows.filter((r) => r.status.label === "Successful").length;
  const pendingCount = rows.filter((r) => r.status.label === "Pending").length;
  const failed = rows.filter((r) => r.status.label === "Failed").length;
  const refunded = rows.filter((r) => r.status.label === "Refunded").length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[#111827]">Payments</h1>
          <p className="mt-1 text-sm text-[#6B7280]">
            Monitor payment activity across your store.
          </p>
        </div>
        <StoreSelector
          stores={stores}
          activeId={active.id}
          basePath="/commerce/payments"
        />
      </div>

      <div className="grid gap-2 grid-cols-2 sm:grid-cols-5">
        {[
          { label: "Payment volume", value: formatCommerceMoney(volume, "USD") },
          { label: "Successful", value: String(successful) },
          { label: "Pending", value: String(pendingCount) },
          { label: "Failed", value: String(failed) },
          { label: "Refunded", value: String(refunded) },
        ].map((kpi) => (
          <CommerceCard key={kpi.label} className="px-3 py-3">
            <p className="text-[11px] text-[#6B7280]">{kpi.label}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-[#111827]">
              {kpi.value}
            </p>
          </CommerceCard>
        ))}
      </div>

      <CommerceCard className="p-4">
        <h2 className="text-sm font-semibold text-[#111827]">Payment providers</h2>
        <p className="mt-0.5 text-xs text-[#6B7280]">
          Platform-managed checkout providers for native Jimvio stores.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {PROVIDERS.map((p) => (
            <div
              key={p.name}
              className="rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] px-3 py-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-[#111827]">{p.name}</p>
                <CommerceStatusBadge label={p.status} tone="success" />
              </div>
              <p className="mt-1 text-xs text-[#6B7280]">{p.methods}</p>
              <p className="mt-1 text-[11px] text-[#9CA3AF]">Production</p>
            </div>
          ))}
        </div>
      </CommerceCard>

      <form className="flex flex-wrap gap-2" action="/commerce/payments" method="get">
        <input type="hidden" name="storeId" value={active.id} />
        <input
          name="q"
          defaultValue={q || ""}
          placeholder="Search orders, customers..."
          className="h-10 min-w-[200px] flex-1 rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm"
          aria-label="Search payments"
        />
        <select
          name="status"
          defaultValue={statusFilter}
          className="h-10 rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm"
          aria-label="Filter payment status"
        >
          <option value="all">All statuses</option>
          <option value="successful">Successful</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </select>
        <button
          type="submit"
          className="h-10 rounded-lg bg-[#FF5A1F] px-3 text-sm font-semibold text-white"
        >
          Apply
        </button>
      </form>

      {!filtered.length ? (
        <CommerceEmptyState
          title="No payment activity yet"
          description="Payments appear here when customers complete checkout on your storefront."
          action={
            <Link
              href={`/commerce/orders?storeId=${active.id}`}
              className="rounded-lg bg-[#FF5A1F] px-4 py-2 text-xs font-semibold text-white"
            >
              View orders
            </Link>
          }
        />
      ) : (
        <>
          <div className="space-y-2 md:hidden">
            {filtered.map((r) => (
              <Link key={r.id} href={`/commerce/orders/${r.id}?storeId=${active.id}`}>
                <CommerceCard className="mb-2 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-[#111827]">{r.orderNumber}</p>
                      <p className="text-xs text-[#6B7280]">
                        {r.customer} · {r.provider}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold tabular-nums">
                        {formatCommerceMoney(r.amount, r.currency)}
                      </p>
                      <div className="mt-1">
                        <CommerceStatusBadge
                          label={r.status.label}
                          tone={r.status.tone}
                        />
                      </div>
                    </div>
                  </div>
                </CommerceCard>
              </Link>
            ))}
          </div>

          <CommerceCard className="hidden overflow-hidden md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#E5E7EB] bg-[#F8FAFC] text-[11px] uppercase tracking-wide text-[#6B7280]">
                <tr>
                  <th className="px-4 py-3 font-medium">Transaction</th>
                  <th className="px-4 py-3 font-medium">Order</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Provider</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b border-[#F3F4F6] last:border-0">
                    <td className="px-4 py-3 font-medium text-[#111827]">
                      <Link
                        href={`/commerce/orders/${r.id}?storeId=${active.id}`}
                        className="hover:text-[#FF5A1F]"
                      >
                        {r.reference}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/commerce/orders/${r.id}?storeId=${active.id}`}
                        className="text-[#374151] hover:text-[#FF5A1F]"
                      >
                        {r.orderNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-[#6B7280]">{r.customer}</td>
                    <td className="px-4 py-3 text-[#374151]">{r.provider}</td>
                    <td className="px-4 py-3 tabular-nums font-medium">
                      {formatCommerceMoney(r.amount, r.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <CommerceStatusBadge
                        label={r.status.label}
                        tone={r.status.tone}
                      />
                    </td>
                    <td className="px-4 py-3 text-[#6B7280]">
                      {new Date(r.date).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CommerceCard>
        </>
      )}

      <CommerceCard className="p-4">
        <h2 className="text-sm font-semibold text-[#111827]">Webhook health</h2>
        <p className="mt-1 text-sm text-[#6B7280]">
          Store-scoped payment webhook events. Secrets and raw signatures are never
          shown. Browser return URLs alone never finalize payment.
        </p>
        {(() => {
          const received = webhookEvents.length;
          const processed = webhookEvents.filter((e) =>
            ["completed", "processed", "success"].includes(
              String(e.status || "").toLowerCase(),
            ),
          ).length;
          const failed = webhookEvents.filter((e) =>
            ["failed", "error"].includes(String(e.status || "").toLowerCase()),
          ).length;
          const lastOk = webhookEvents.find((e) =>
            ["completed", "processed", "success"].includes(
              String(e.status || "").toLowerCase(),
            ),
          );
          const lastFail = webhookEvents.find((e) =>
            ["failed", "error"].includes(String(e.status || "").toLowerCase()),
          );
          return (
            <div className="mt-3 grid gap-2 grid-cols-2 sm:grid-cols-4">
              <div className="rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] px-3 py-2">
                <p className="text-[11px] text-[#6B7280]">Received</p>
                <p className="text-lg font-semibold tabular-nums">{received}</p>
              </div>
              <div className="rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] px-3 py-2">
                <p className="text-[11px] text-[#6B7280]">Processed</p>
                <p className="text-lg font-semibold tabular-nums">{processed}</p>
              </div>
              <div className="rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] px-3 py-2">
                <p className="text-[11px] text-[#6B7280]">Failed</p>
                <p className="text-lg font-semibold tabular-nums">{failed}</p>
              </div>
              <div className="rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] px-3 py-2">
                <p className="text-[11px] text-[#6B7280]">Last success</p>
                <p className="text-xs font-medium">
                  {lastOk
                    ? new Date(lastOk.created_at).toLocaleString()
                    : "—"}
                </p>
                {lastFail ? (
                  <p className="mt-1 text-[11px] text-red-600">
                    Last failure {new Date(lastFail.created_at).toLocaleDateString()}
                  </p>
                ) : null}
              </div>
            </div>
          );
        })()}
        {webhookEvents.length ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-[11px] uppercase tracking-wide text-[#9CA3AF]">
                <tr>
                  <th className="pb-2 font-medium">Provider</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Order</th>
                  <th className="pb-2 font-medium">Reference</th>
                  <th className="pb-2 font-medium">Received</th>
                  <th className="pb-2 font-medium">Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3F4F6]">
                {webhookEvents.slice(0, 20).map((e) => (
                  <tr key={e.id}>
                    <td className="py-2 font-medium capitalize">{e.provider}</td>
                    <td className="py-2">{e.status}</td>
                    <td className="py-2">
                      {e.order_id ? (
                        <Link
                          href={`/commerce/orders/${e.order_id}?storeId=${active.id}`}
                          className="text-[#FF5A1F]"
                        >
                          {e.order_id.slice(0, 8)}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-2 font-mono text-xs text-[#6B7280]">
                      {e.idempotency_key.slice(0, 24)}
                    </td>
                    <td className="py-2 text-[#6B7280]">
                      {new Date(e.created_at).toLocaleString()}
                    </td>
                    <td className="py-2 text-xs text-red-600">
                      {e.error ? String(e.error).slice(0, 80) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-3 text-sm text-[#6B7280]">
            No webhook events for this store&apos;s orders yet.
          </p>
        )}
        <p className="mt-3 text-xs text-[#9CA3AF]">
          Safe retry of failed webhooks is handled by provider redelivery +
          existing idempotency keys. Manual retry is not exposed here to avoid
          duplicate ledger or fulfillment side effects.
        </p>
      </CommerceCard>
    </div>
  );
}
