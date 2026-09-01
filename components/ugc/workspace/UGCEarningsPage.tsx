"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Download } from "lucide-react";
import { useCurrency } from "@/context/CurrencyContext";
import { Button } from "@/components/ui/button";
import {
  UGCPageEmpty,
  UGCPageError,
  UGCPageLoading,
  UGCPageShell,
  UGCStatusPill,
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

type PayoutHistoryRow = {
  id: string;
  amount?: number;
  status?: string;
  created_at: string;
  paid_at?: string | null;
  campaign?: { id?: string; title?: string } | null;
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
  const [history, setHistory] = useState<PayoutHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const statsPromise = fetch("/api/ugc/creator/stats", { cache: "no-store" });
      const historyPromise =
        mode === "payouts"
          ? fetch("/api/ugc/payouts/history", { cache: "no-store" })
          : Promise.resolve(null);
      const [statsRes, histRes] = await Promise.all([statsPromise, historyPromise]);
      if (!statsRes.ok) throw new Error("load failed");
      setData(await statsRes.json());
      if (histRes?.ok) {
        const hJson = await histRes.json();
        setHistory(hJson.data ?? hJson.payouts ?? []);
      } else if (mode === "payouts") {
        setHistory([]);
      }
    } catch {
      setError("Could not load earnings data.");
    } finally {
      setLoading(false);
    }
  }, [mode]);

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
            <Button asChild className="rounded-xl bg-[#FF5A1F]">
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
              <div className="flex gap-2">
                <Button asChild size="sm" className="rounded-xl bg-[#FF5A1F] hover:bg-[#F04E15]">
                  <Link href="/wallet">Open Wallet OS</Link>
                </Button>
                <Button asChild size="sm" variant="outline" className="rounded-xl">
                  <Link href="/wallet">Open wallet</Link>
                </Button>
                <Button asChild size="sm" variant="outline" className="rounded-xl">
                  <Link href="/identity/wallet">Unified wallet</Link>
                </Button>
              </div>
            </div>
            <p className="mt-2 text-[13px] text-[#6B7280]">
              {mode === "payouts"
                ? "Manage withdrawals, payout methods, and verification from your Jimvio wallet."
                : `Total from UGC submissions: ${formatMoney(s.ugcEarnings, "USD")}`}
              {" "}See earnings combined with marketplace, affiliate and community income in{" "}
              <Link href="/wallet" className="font-medium text-[#FF5A1F] underline underline-offset-2">
                Wallet OS
              </Link>
              , or the{" "}
              <Link href="/identity/wallet" className="font-medium text-[#FF5A1F] underline underline-offset-2">
                unified Identity wallet
              </Link>
              .
            </p>
            {mode === "payouts" ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <Button asChild className="rounded-xl bg-[#FF5A1F]">
                  <Link href="/wallet">Request withdrawal</Link>
                </Button>
                <Button asChild variant="outline" className="rounded-xl">
                  <Link href="/wallet">Payment methods</Link>
                </Button>
                <Button asChild variant="outline" className="rounded-xl">
                  <a href="/api/ugc/payouts/history?format=csv">
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                  </a>
                </Button>
              </div>
            ) : null}
          </div>

          {mode === "payouts" ? (
            <div className="rounded-[16px] border border-[#EEF0F2] bg-white p-4">
              <h2 className="text-[14px] font-bold text-[#111827]">Payout timeline</h2>
              <div className="mt-3 space-y-2">
                {history.length === 0 ? (
                  <p className="text-[12px] text-[#6B7280]">No payout history yet.</p>
                ) : (
                  history.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-lg bg-[#FAFAFA] px-3 py-2"
                    >
                      <div>
                        <p className="text-[13px] font-medium">
                          {p.campaign?.title ?? "Campaign payout"}
                        </p>
                        <p className="text-[11px] text-[#6B7280]">
                          {new Date(p.paid_at || p.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {p.status ? <UGCStatusPill status={p.status} /> : null}
                        <p className="text-[13px] font-bold text-emerald-600">
                          {formatMoney(Number(p.amount) || 0, "USD")}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : null}

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
