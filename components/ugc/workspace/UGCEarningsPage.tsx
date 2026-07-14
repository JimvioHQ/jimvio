"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useCurrency } from "@/context/CurrencyContext";
import { Button } from "@/components/ui/button";
import {
  UGCPageEmpty,
  UGCPageError,
  UGCPageLoading,
  UGCPageShell,
} from "./UGCPageShell";

type StatsResponse = {
  needsProfile?: boolean;
  summary?: {
    availableBalance: number;
    pendingBalance: number;
    lifetimeEarnings: number;
    ugcEarnings: number;
  };
  recentSubmissions?: {
    id: string;
    total_earnings: number;
    status: string;
    created_at: string;
    campaign: { title: string } | null;
  }[];
};

function BalanceCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[16px] border border-[#EEF0F2] bg-white p-4">
      <p className="text-[10px] font-semibold uppercase text-[#9CA3AF]">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-[#111827]">{value}</p>
    </div>
  );
}

export function UGCEarningsPage({ mode = "earnings" }: { mode?: "earnings" | "payouts" }) {
  const { formatMoney } = useCurrency();
  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ugc/creator/stats", { cache: "no-store" });
      if (!res.ok) throw new Error("load failed");
      setData(await res.json());
    } catch {
      setError("Could not load earnings data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const s = data?.summary;
  const title = mode === "payouts" ? "Payouts" : "Earnings";
  const subtitle =
    mode === "payouts"
      ? "Withdrawal status, history, and payout methods."
      : "Available balance, pending earnings, and campaign breakdown.";

  return (
    <UGCPageShell title={title} subtitle={subtitle}>
      {loading ? <UGCPageLoading /> : null}
      {!loading && error ? <UGCPageError message={error} onRetry={load} /> : null}
      {!loading && !error && (data?.needsProfile || !s) ? (
        <UGCPageEmpty
          title="No earnings yet"
          description="Submit approved content to start earning from UGC campaigns."
          action={
            <Button asChild className="rounded-xl bg-[var(--color-accent)]">
              <Link href="/ugc">Discover campaigns</Link>
            </Button>
          }
        />
      ) : null}

      {!loading && !error && s ? (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <BalanceCard label="Available balance" value={formatMoney(s.availableBalance, "USD")} />
            <BalanceCard label="Pending balance" value={formatMoney(s.pendingBalance, "USD")} />
            <BalanceCard label="Lifetime earnings" value={formatMoney(s.lifetimeEarnings, "USD")} />
          </div>

          <div className="rounded-[16px] border border-[#EEF0F2] bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-[14px] font-bold text-[#111827]">
                {mode === "payouts" ? "Withdraw funds" : "UGC campaign earnings"}
              </h2>
              <Button asChild size="sm" variant="outline" className="rounded-xl">
                <Link href="/dashboard/wallet">Open wallet</Link>
              </Button>
            </div>
            <p className="mt-2 text-[13px] text-[#6B7280]">
              {mode === "payouts"
                ? "Manage withdrawals, payout methods, and verification from your Jimvio wallet."
                : `Total from UGC submissions: ${formatMoney(s.ugcEarnings, "USD")}`}
            </p>
            {mode === "payouts" ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <Button asChild className="rounded-xl bg-[var(--color-accent)]">
                  <Link href="/dashboard/wallet">Request withdrawal</Link>
                </Button>
                <Button asChild variant="outline" className="rounded-xl">
                  <Link href="/dashboard/payments">Payment methods</Link>
                </Button>
              </div>
            ) : null}
          </div>

          <div className="rounded-[16px] border border-[#EEF0F2] bg-white p-4">
            <h2 className="text-[14px] font-bold text-[#111827]">Recent transactions</h2>
            <div className="mt-3 space-y-2">
              {(data.recentSubmissions ?? []).length === 0 ? (
                <p className="text-[12px] text-[#6B7280]">No transactions yet.</p>
              ) : (
                (data.recentSubmissions ?? []).map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between rounded-lg bg-[#FAFAFA] px-3 py-2"
                  >
                    <div>
                      <p className="text-[13px] font-medium">
                        {(tx.campaign as { title?: string } | null)?.title ?? "Campaign"}
                      </p>
                      <p className="text-[11px] text-[#6B7280]">
                        {new Date(tx.created_at).toLocaleDateString()} · {tx.status}
                      </p>
                    </div>
                    <p className="text-[13px] font-bold text-emerald-600">
                      {formatMoney(Number(tx.total_earnings) || 0, "USD")}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}
    </UGCPageShell>
  );
}
