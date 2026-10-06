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
import { ensureWallet } from "@/lib/wallet-os/ensure";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { PLATFORM_CURRENCY } from "@/lib/currency/platform";
import { formatCommerceMoney, sumCommerceUsd } from "@/lib/commerce-os/money";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ storeId?: string; tab?: string }>;
};

export default async function CommerceFinancePage({ searchParams }: Props) {
  const auth = await requireCommerceMerchant();
  if (!auth.ok) {
    if (auth.status === 401) redirect("/login?next=/commerce/finance");
    return <p className="text-sm text-[#4B5563]">{auth.error}</p>;
  }

  const { storeId, tab } = await searchParams;
  const activeTab =
    tab === "transactions" || tab === "payouts" || tab === "earnings"
      ? tab
      : "overview";
  const db = cosAdminDb();
  const stores = await listVendorJimvioStores(db, auth.vendorId);
  const active = pickActiveStore(stores, storeId);

  if (!active) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-semibold text-[#111827]">Finance</h1>
        <Link href="/commerce/stores" className="text-sm font-semibold text-[#FF5A1F]">
          Create a store
        </Link>
      </div>
    );
  }

  const wallet = await ensureWallet(auth.userId);
  const service = createServiceRoleClient();

  const [{ data: earnings }, { data: payouts }, { data: paidOrders }] =
    await Promise.all([
      service
        .from("transactions")
        .select("id, amount, currency, status, type, reference, created_at, metadata")
        .eq("user_id", auth.userId)
        .eq("type", "vendor_earning")
        .order("created_at", { ascending: false })
        .limit(40),
      service
        .from("payouts")
        .select("id, amount, currency, status, method, created_at, reference")
        .eq("user_id", auth.userId)
        .order("created_at", { ascending: false })
        .limit(20),
      db
        .from("orders")
        .select("id, total_amount, currency, payment_status, created_at")
        .eq("jimvio_store_id", active.id)
        .eq("vendor_id", auth.vendorId)
        .in("payment_status", ["paid", "completed"]),
    ]);

  const grossSales = sumCommerceUsd(paidOrders ?? []);
  const available = Number(wallet.available_balance ?? 0);
  const pending = Number(wallet.pending_balance ?? 0);
  const paidOut = Number(wallet.total_paid ?? 0);
  const lifetime = Number(wallet.total_earned ?? 0);

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "transactions", label: "Transactions" },
    { id: "earnings", label: "Earnings" },
    { id: "payouts", label: "Payouts" },
  ] as const;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#111827]">
            Revenue
          </h1>
          <p className="mt-1 text-sm text-[#6B7280]">
            Ledger-backed balances for {active.name}. No estimated profit figures.
          </p>
        </div>
        <StoreSelector
          stores={stores}
          activeId={active.id}
          basePath="/commerce/finance"
        />
      </div>

      <div className="flex flex-wrap gap-1 rounded-xl border border-[#E5E7EB] bg-white p-1">
        {tabs.map((t) => (
          <Link
            key={t.id}
            href={`/commerce/finance?storeId=${active.id}&tab=${t.id}`}
            className={
              activeTab === t.id
                ? "rounded-lg bg-[#FF5A1F]/10 px-3 py-1.5 text-xs font-semibold text-[#FF5A1F]"
                : "rounded-lg px-3 py-1.5 text-xs font-semibold text-[#6B7280] hover:bg-[#F9FAFB]"
            }
          >
            {t.label}
          </Link>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "Gross sales", value: formatCommerceMoney(grossSales, PLATFORM_CURRENCY) },
          { label: "Pending", value: formatCommerceMoney(pending, PLATFORM_CURRENCY) },
          { label: "Available", value: formatCommerceMoney(available, PLATFORM_CURRENCY) },
          { label: "Paid out", value: formatCommerceMoney(paidOut, PLATFORM_CURRENCY) },
          { label: "Lifetime earnings", value: formatCommerceMoney(lifetime, PLATFORM_CURRENCY) },
        ].map((card) => (
          <CommerceCard key={card.label} className="p-4">
            <p className="text-xs text-[#6B7280]">{card.label}</p>
            <p className="mt-2 text-xl font-semibold tabular-nums text-[#111827]">
              {card.value}
            </p>
          </CommerceCard>
        ))}
      </div>

      {activeTab === "overview" || activeTab === "earnings" ? (
        <CommerceCard className="p-5">
          <h2 className="text-sm font-semibold text-[#111827]">
            Recent earnings
          </h2>
          {!(earnings ?? []).length ? (
            <p className="mt-4 text-sm text-[#6B7280]">
              Earnings appear after paid orders credit your wallet ledger.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="text-[11px] uppercase tracking-wide text-[#9CA3AF]">
                  <tr>
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium">Reference</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F3F4F6]">
                  {(earnings ?? []).map((tx) => (
                    <tr key={tx.id}>
                      <td className="py-2.5 text-[#6B7280]">
                        {new Date(tx.created_at).toLocaleString()}
                      </td>
                      <td className="py-2.5 font-medium text-[#111827]">
                        {tx.reference || tx.id.slice(0, 8)}
                      </td>
                      <td className="py-2.5 text-[#6B7280]">{tx.status}</td>
                      <td className="py-2.5 text-right tabular-nums font-semibold">
                        {formatCommerceMoney(Number(tx.amount || 0), tx.currency || PLATFORM_CURRENCY)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CommerceCard>
      ) : null}

      {activeTab === "transactions" ? (
        <CommerceCard className="p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-[#111827]">
              Wallet transactions
            </h2>
            <Link href="/wallet/transactions" className="text-xs font-semibold text-[#FF5A1F]">
              Full wallet ledger
            </Link>
          </div>
          <p className="mt-2 text-sm text-[#6B7280]">
            Full multi-product ledger (sales, fees, deposits, withdrawals) lives in
            Wallet OS. Commerce Finance shows store gross sales and vendor earnings.
          </p>
        </CommerceCard>
      ) : null}

      {activeTab === "payouts" || activeTab === "overview" ? (
        <CommerceCard className="p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-[#111827]">Payouts</h2>
            <Link href="/wallet/withdrawals" className="text-xs font-semibold text-[#FF5A1F]">
              Request payout
            </Link>
          </div>
          {!(payouts ?? []).length ? (
            <p className="mt-4 text-sm text-[#6B7280]">
              No payouts yet. Available balance can be withdrawn from Wallet OS when
              settlement rules allow.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="text-[11px] uppercase tracking-wide text-[#9CA3AF]">
                  <tr>
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium">Method</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F3F4F6]">
                  {(payouts ?? []).map((p) => (
                    <tr key={p.id}>
                      <td className="py-2.5 text-[#6B7280]">
                        {new Date(p.created_at).toLocaleString()}
                      </td>
                      <td className="py-2.5 text-[#111827]">{p.method || "—"}</td>
                      <td className="py-2.5 text-[#6B7280]">{p.status}</td>
                      <td className="py-2.5 text-right tabular-nums font-semibold">
                        {formatCommerceMoney(Number(p.amount || 0), p.currency || PLATFORM_CURRENCY)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CommerceCard>
      ) : null}
    </div>
  );
}
