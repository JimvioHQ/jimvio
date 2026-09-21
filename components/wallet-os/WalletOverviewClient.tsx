"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
} from "lucide-react";
import { formatMoneyAsUSD } from "@/lib/currency/platform";
import type { LedgerEntry, WalletOsOverview } from "@/lib/wallet-os/types";
import { surfaceLabel } from "@/lib/wallet-os/surfaces";
import {
  WalletErrorState,
  WalletLoading,
  useWalletFetch,
} from "./wallet-ui";

type OverviewApiResponse = {
  overview?: WalletOsOverview;
  error?: string;
};

type LedgerApiResponse = {
  entries?: LedgerEntry[];
};

function activityTitle(entry: LedgerEntry): string {
  const title = entry.title?.trim();
  if (title) return title;
  return surfaceLabel(entry.surface);
}

function formatActivityWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startThat = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((startToday.getTime() - startThat.getTime()) / 86_400_000);
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (diffDays === 0) return `Today · ${time}`;
  if (diffDays === 1) return `Yesterday · ${time}`;
  return `${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })} · ${time}`;
}

export function WalletOverviewClient() {
  const { status, data, error, retry } = useWalletFetch<OverviewApiResponse>(
    "/api/wallet/os/overview",
  );
  const {
    status: ledgerStatus,
    data: ledgerData,
  } = useWalletFetch<LedgerApiResponse>("/api/wallet/os/ledger?limit=8");

  const [selected, setSelected] = useState<LedgerEntry | null>(null);

  const overview = data?.overview;
  const currency = overview?.currency || "USD";
  /** Authoritative spendable/withdrawable balance — wallets.available_balance */
  const totalBalance = overview?.available ?? 0;
  const recent = ledgerData?.entries ?? [];
  const hasActivity = recent.length > 0;

  const growthHint = useMemo(() => {
    // No fabricated chart — only show a compact note until a real balance-history API exists.
    return null as null;
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pt-8">
      {status === "loading" && <WalletLoading label="Loading your wallet…" />}
      {status === "error" && (
        <WalletErrorState message={error || "Could not load your wallet overview."} onRetry={retry} />
      )}

      {(status === "ready" || status === "empty") && (
        <div className="space-y-5">
          {/* Hero balance card — Jimvio orange, reference-inspired */}
          <section
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#FF5A1F] via-[#FF6B35] to-[#E54E18] p-6 text-white shadow-[0_16px_40px_-12px_rgba(255,90,31,0.45)] sm:p-8"
            aria-label="Total balance"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -right-8 -top-10 h-48 w-48 rounded-full bg-white/10 blur-2xl"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute bottom-0 left-1/3 h-40 w-64 rounded-full bg-white/5 blur-3xl"
            />
            <div
              aria-hidden
              className="absolute right-6 top-6 grid grid-cols-4 gap-1.5 opacity-40"
            >
              {Array.from({ length: 12 }).map((_, i) => (
                <span key={i} className="h-1.5 w-1.5 rounded-full bg-white" />
              ))}
            </div>

            <div className="relative flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[13px] font-medium text-white/80">Balance</p>
                <p className="mt-1 text-[40px] font-bold tracking-tight tabular-nums sm:text-[48px]">
                  {formatMoneyAsUSD(totalBalance, currency)}
                </p>
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-[12px] font-semibold backdrop-blur-sm">
                <span aria-hidden className="text-[14px]">
                  🇺🇸
                </span>
                USD
              </div>
            </div>

            <div className="relative mt-7 flex flex-wrap gap-2.5">
              <Link
                href="/wallet/deposits"
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-4 text-[13px] font-bold text-[#FF5A1F] shadow-sm transition hover:bg-white/95 active:scale-[0.99]"
              >
                <Plus className="h-4 w-4" strokeWidth={2.5} />
                Add Funds
              </Link>
              <Link
                href="/wallet/withdrawals"
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/30 bg-white/15 px-4 text-[13px] font-bold text-white backdrop-blur-sm transition hover:bg-white/25 active:scale-[0.99]"
              >
                <ArrowUpRight className="h-4 w-4" />
                Withdraw
              </Link>
            </div>
          </section>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {/* Balance Growth — real data only; no fake chart */}
            <section className="rounded-3xl border border-[#E5E7EB] bg-white p-5 shadow-[0_8px_30px_rgba(17,24,39,0.04)] sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-[15px] font-bold text-[#111827]">Balance Growth</h2>
                <span className="rounded-full bg-[#FFF1EA] px-2.5 py-1 text-[11px] font-semibold text-[#FF5A1F]">
                  7D
                </span>
              </div>
              <div className="mt-8 flex min-h-[160px] flex-col items-center justify-center rounded-2xl bg-[#F8FAFC] px-4 text-center">
                <p className="text-[13px] font-medium text-[#6B7280]">
                  Balance history will appear here as your wallet activity grows.
                </p>
                {growthHint}
              </div>
            </section>

            {/* Recent Transactions */}
            <section className="rounded-3xl border border-[#E5E7EB] bg-white p-5 shadow-[0_8px_30px_rgba(17,24,39,0.04)] sm:p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-[15px] font-bold text-[#111827]">Recent Transactions</h2>
                <Link
                  href="/wallet/transactions"
                  className="text-[12px] font-semibold text-[#FF5A1F] hover:underline"
                >
                  View all →
                </Link>
              </div>

              {ledgerStatus === "loading" ? (
                <WalletLoading label="Loading activity…" />
              ) : !hasActivity ? (
                <div className="rounded-2xl bg-[#F8FAFC] px-4 py-8 text-center">
                  <p className="text-[14px] font-semibold text-[#111827]">No transactions yet</p>
                  <p className="mt-1 text-[13px] text-[#6B7280]">
                    Add funds or complete an activity on Jimvio to see it here.
                  </p>
                  <Link
                    href="/wallet/deposits"
                    className="mt-4 inline-flex h-9 items-center rounded-xl bg-[#FF5A1F] px-4 text-[12px] font-bold text-white"
                  >
                    Add Funds
                  </Link>
                </div>
              ) : (
                <ul className="divide-y divide-[#F3F4F6]">
                  {recent.map((entry) => {
                    const credit = entry.direction === "credit";
                    const sign = credit ? "+" : "−";
                    return (
                      <li key={entry.id}>
                        <button
                          type="button"
                          onClick={() => setSelected(entry)}
                          className="flex w-full items-center gap-3 py-3 text-left transition-colors hover:bg-[#F8FAFC]/80"
                        >
                          <span
                            className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${
                              credit ? "bg-[#ECFDF5] text-[#059669]" : "bg-[#FEF2F2] text-[#DC2626]"
                            }`}
                          >
                            {credit ? (
                              <ArrowDownLeft className="h-4 w-4" />
                            ) : (
                              <ArrowUpRight className="h-4 w-4" />
                            )}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p
                              className={`text-[14px] font-bold tabular-nums ${
                                credit ? "text-[#059669]" : "text-[#111827]"
                              }`}
                            >
                              {sign}
                              {formatMoneyAsUSD(Math.abs(entry.amount), entry.currency || currency)}
                            </p>
                            <p className="truncate text-[12px] text-[#6B7280]">
                              {activityTitle(entry)}
                            </p>
                          </div>
                          <p className="shrink-0 text-[11px] text-[#9CA3AF]">
                            {formatActivityWhen(entry.createdAt)}
                          </p>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        </div>
      )}

      {selected ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="tx-detail-title"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="tx-detail-title" className="text-[16px] font-bold text-[#111827]">
              Transaction details
            </h2>
            <dl className="mt-4 space-y-3 text-[13px]">
              <div className="flex justify-between gap-3">
                <dt className="text-[#6B7280]">Amount</dt>
                <dd className="font-semibold tabular-nums text-[#111827]">
                  {selected.direction === "credit" ? "+" : "−"}
                  {formatMoneyAsUSD(Math.abs(selected.amount), selected.currency || currency)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[#6B7280]">Status</dt>
                <dd className="font-semibold capitalize text-[#111827]">{selected.status}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[#6B7280]">Source</dt>
                <dd className="text-right font-semibold text-[#111827]">
                  {activityTitle(selected)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[#6B7280]">Category</dt>
                <dd className="font-semibold text-[#111827]">{surfaceLabel(selected.surface)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[#6B7280]">Date</dt>
                <dd className="text-right font-semibold text-[#111827]">
                  {new Date(selected.createdAt).toLocaleString()}
                </dd>
              </div>
              {selected.reference ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-[#6B7280]">Reference</dt>
                  <dd className="max-w-[60%] truncate text-right font-mono text-[12px] text-[#111827]">
                    {selected.reference}
                  </dd>
                </div>
              ) : null}
            </dl>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="inline-flex h-10 flex-1 items-center justify-center rounded-xl border border-[#E5E7EB] text-[13px] font-semibold text-[#111827]"
              >
                Close
              </button>
              <Link
                href="/wallet/transactions"
                className="inline-flex h-10 flex-1 items-center justify-center rounded-xl bg-[#FF5A1F] text-[13px] font-bold text-white"
              >
                All transactions
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
