"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
} from "lucide-react";
import { formatMoneyAsUSD } from "@/lib/currency/platform";
import type { LedgerEntry, WalletOsOverview } from "@/lib/wallet-os/types";
import { surfaceLabel } from "@/lib/wallet-os/surfaces";
import type { WalletSurface } from "@/lib/wallet-os/types";
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

type HistoryResponse = {
  days: number;
  total: number;
  points: { date: string; balance: number }[];
  sources: { surface: string; amount: number }[];
};

/** Real balance line: flat when nothing happened, rising when money comes in. */
function BalanceChart({ points }: { points: HistoryResponse["points"] }) {
  const W = 320;
  const H = 120;
  const max = Math.max(1, ...points.map((p) => p.balance));
  const step = points.length > 1 ? W / (points.length - 1) : W;
  const y = (v: number) => H - 8 - (v / max) * (H - 24);
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${y(p.balance).toFixed(1)}`).join(" ");
  const area = `${line} L${W},${H} L0,${H} Z`;
  const last = points[points.length - 1];
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-[150px] w-full" preserveAspectRatio="none" role="img" aria-label="Balance over time">
        <defs>
          <linearGradient id="balfill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#FF5A1F" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#FF5A1F" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1="0" x2={W} y1={H * f} y2={H * f} stroke="#F1F5F9" strokeWidth="1" />
        ))}
        <path d={area} fill="url(#balfill)" />
        <path d={line} fill="none" stroke="#FF5A1F" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        {last ? <circle cx={W} cy={y(last.balance)} r="4" fill="#FF5A1F" stroke="white" strokeWidth="2" vectorEffect="non-scaling-stroke" /> : null}
      </svg>
      <div className="mt-1 flex justify-between text-[10.5px] text-[#9CA3AF]">
        <span>{points[0] ? new Date(`${points[0].date}T12:00:00Z`).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : ""}</span>
        <span>Today</span>
      </div>
    </div>
  );
}

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
  // One main balance for all of Jimvio (UGC, community, marketplace, affiliate…),
  // the same number shown in the header. Only "available" can be withdrawn.
  const totalBalance = overview?.netWorth ?? 0;
  const available = overview?.available ?? 0;
  const onTheWay = Math.round(((overview?.pending ?? 0) + (overview?.locked ?? 0)) * 100) / 100;
  const [range, setRange] = useState<7 | 30>(7);
  const [history, setHistory] = useState<HistoryResponse | null>(null);
  useEffect(() => {
    let alive = true;
    fetch(`/api/wallet/os/history?days=${range}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (alive) setHistory(j as HistoryResponse | null);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [range]);
  const growth = history?.points?.length ? history.points[history.points.length - 1].balance - history.points[0].balance : 0;
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
                <p className="text-[13px] font-medium text-white/80">Total balance</p>
                <p className="mt-1 text-[40px] font-bold tracking-tight tabular-nums sm:text-[48px]">
                  {formatMoneyAsUSD(totalBalance, currency)}
                </p>
                <div className="mt-2 flex flex-wrap gap-2 text-[12px]">
                  <span className="rounded-full bg-white/15 px-3 py-1">
                    Available to withdraw <b className="tabular-nums">{formatMoneyAsUSD(available, currency)}</b>
                  </span>
                  {onTheWay > 0 ? (
                    <span className="rounded-full bg-white/15 px-3 py-1">
                      On the way <b className="tabular-nums">{formatMoneyAsUSD(onTheWay, currency)}</b>
                    </span>
                  ) : null}
                  {overview?.rewards ? (
                    <span className="rounded-full bg-white/15 px-3 py-1">
                      Rewards <b className="tabular-nums">{formatMoneyAsUSD(overview.rewards, currency)}</b>
                    </span>
                  ) : null}
                </div>
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
                <div>
                  <h2 className="text-[15px] font-bold text-[#111827]">Balance Growth</h2>
                  <p className={`text-[12px] font-semibold ${growth > 0 ? "text-[#059669]" : growth < 0 ? "text-[#DC2626]" : "text-[#9CA3AF]"}`}>
                    {growth > 0 ? "+" : growth < 0 ? "−" : ""}
                    {formatMoneyAsUSD(Math.abs(growth), currency)} in {range} days
                  </p>
                </div>
                <div className="inline-flex rounded-full bg-[#F3F4F6] p-0.5" role="radiogroup" aria-label="Range">
                  {([7, 30] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      role="radio"
                      aria-checked={range === d}
                      onClick={() => setRange(d)}
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${range === d ? "bg-white text-[#FF5A1F] shadow-sm" : "text-[#6B7280]"}`}
                    >
                      {d}D
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-4">
                {history ? <BalanceChart points={history.points} /> : <div className="h-[150px] animate-pulse rounded-2xl bg-[#F8FAFC]" />}
                {growthHint}
              </div>
              {history?.sources?.length ? (
                <div className="mt-4 border-t border-[#F3F4F6] pt-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF]">Where your money came from</p>
                  <ul className="mt-2 space-y-1.5">
                    {history.sources.slice(0, 5).map((src) => {
                      const total = history.sources.reduce((a, b) => a + b.amount, 0) || 1;
                      return (
                        <li key={src.surface} className="text-[12.5px]">
                          <div className="flex justify-between">
                            <span className="font-medium text-[#374151]">{surfaceLabel(src.surface as WalletSurface)}</span>
                            <span className="font-semibold tabular-nums text-[#111827]">{formatMoneyAsUSD(src.amount, currency)}</span>
                          </div>
                          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#F3F4F6]">
                            <div className="h-full rounded-full bg-[#FF5A1F]" style={{ width: `${Math.max(4, (src.amount / total) * 100)}%` }} />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}
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
                              {entry.status === "pending" || entry.status === "processing" ? (
                                <span className="ml-1.5 rounded-full bg-amber-50 px-1.5 py-px text-[10.5px] font-semibold text-amber-700">
                                  {credit ? "On the way" : "Processing"}
                                </span>
                              ) : null}
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
