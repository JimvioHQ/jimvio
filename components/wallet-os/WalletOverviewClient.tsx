"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeftRight,
  ArrowUpRight,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { formatMoneyAsUSD } from "@/lib/currency/platform";
import type { LedgerEntry, WalletOsOverview } from "@/lib/wallet-os/types";
import { surfaceLabel } from "@/lib/wallet-os/surfaces";
import {
  WalletButton,
  WalletCard,
  WalletErrorState,
  WalletLoading,
  WalletSectionHeading,
  useWalletFetch,
} from "./wallet-ui";

type OverviewApiResponse = {
  overview?: WalletOsOverview;
  error?: string;
};

type LedgerApiResponse = {
  entries?: LedgerEntry[];
};

const QUICK_ACTIONS = [
  { href: "/wallet/deposits", label: "Add funds", icon: Sparkles },
  { href: "/wallet/withdrawals", label: "Withdraw", icon: ArrowUpRight },
  { href: "/wallet/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/wallet/security", label: "Security", icon: ShieldCheck },
];

function activityTitle(entry: LedgerEntry): string {
  const title = entry.title?.trim();
  if (title) return title;
  return surfaceLabel(entry.surface);
}

function relativeDay(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startThat = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((startToday.getTime() - startThat.getTime()) / 86_400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function WalletOverviewClient() {
  const { status, data, error, retry } = useWalletFetch<OverviewApiResponse>(
    "/api/wallet/os/overview",
  );
  const {
    status: ledgerStatus,
    data: ledgerData,
    retry: retryLedger,
  } = useWalletFetch<LedgerApiResponse>("/api/wallet/os/ledger?limit=8");

  const [selected, setSelected] = useState<LedgerEntry | null>(null);

  const overview = data?.overview;
  const currency = overview?.currency || "USD";
  /** Authoritative spendable/withdrawable balance — wallets.available_balance */
  const totalBalance = overview?.available ?? 0;
  const pending = overview?.pending ?? 0;
  const recent = ledgerData?.entries ?? [];
  const hasActivity = recent.length > 0;

  const updatedLabel = useMemo(() => {
    if (!overview?.updatedAt) return null;
    const t = new Date(overview.updatedAt);
    if (Number.isNaN(t.getTime())) return null;
    const ago = Date.now() - t.getTime();
    if (ago < 60_000) return "Updated just now";
    if (ago < 3_600_000) return `Updated ${Math.floor(ago / 60_000)}m ago`;
    return `Updated ${t.toLocaleString()}`;
  }, [overview?.updatedAt]);

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pt-8">
      <WalletSectionHeading
        eyebrow="Jimvio Wallet"
        title="Your money, all in one place"
        description="Total balance is your settled Jimvio wallet — ready to spend and withdraw."
        className="mb-6"
      />

      {status === "loading" && <WalletLoading label="Loading your wallet…" />}
      {status === "error" && (
        <WalletErrorState message={error || "Could not load your wallet overview."} onRetry={retry} />
      )}

      {(status === "ready" || status === "empty") && (
        <div className="space-y-6">
          <WalletCard className="border border-black/[0.06] bg-white p-6 shadow-[0_8px_30px_rgba(17,24,39,0.04)] sm:p-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9B968D]">
              Total balance
            </p>
            <p className="mt-2 text-[40px] font-bold tracking-tight text-[#111827] tabular-nums sm:text-[48px]">
              {formatMoneyAsUSD(totalBalance, currency)}
            </p>
            <p className="mt-1 text-[13px] text-[#6B7280]">
              {totalBalance === 0
                ? "Your Jimvio balance is ready."
                : "Available to spend and withdraw"}
            </p>
            {pending > 0 ? (
              <p className="mt-2 text-[12px] font-medium text-amber-700">
                {formatMoneyAsUSD(pending, currency)} pending
              </p>
            ) : null}
            {updatedLabel ? (
              <p className="mt-1 text-[11px] text-[#9CA3AF]">{updatedLabel}</p>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-2.5">
              <Link href="/wallet/deposits">
                <WalletButton variant="primary" size="md">
                  <Sparkles className="h-4 w-4" />
                  Add funds
                </WalletButton>
              </Link>
              <Link href="/wallet/withdrawals">
                <WalletButton variant="outline" size="md">
                  <ArrowUpRight className="h-4 w-4" />
                  Withdraw
                </WalletButton>
              </Link>
            </div>
          </WalletCard>

          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9B968D]">
                Recent activity
              </p>
              <Link
                href="/wallet/transactions"
                className="text-[12px] font-semibold text-[#FF5A1F] hover:underline"
              >
                View all
              </Link>
            </div>

            {ledgerStatus === "loading" ? (
              <WalletCard className="p-5">
                <WalletLoading label="Loading activity…" />
              </WalletCard>
            ) : !hasActivity ? (
              <WalletCard className="p-5">
                <p className="text-[14px] font-semibold text-[#111827]">No wallet activity yet.</p>
                <p className="mt-1 text-[13px] text-[#6B7280]">
                  Deposits, earnings, and purchases will show up here.
                </p>
                <div className="mt-4">
                  <Link href="/wallet/deposits">
                    <WalletButton variant="primary" size="sm">
                      Add funds
                    </WalletButton>
                  </Link>
                </div>
              </WalletCard>
            ) : (
              <WalletCard className="overflow-hidden p-0">
                <ul className="divide-y divide-black/[0.05]">
                  {recent.map((entry) => {
                    const credit = entry.direction === "credit";
                    const sign = credit ? "+" : "−";
                    return (
                      <li key={entry.id}>
                        <button
                          type="button"
                          onClick={() => setSelected(entry)}
                          className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[#F8FAFC]"
                        >
                          <div className="min-w-0">
                            <p
                              className={`text-[15px] font-bold tabular-nums ${
                                credit ? "text-[#059669]" : "text-[#111827]"
                              }`}
                            >
                              {sign}
                              {formatMoneyAsUSD(Math.abs(entry.amount), entry.currency || currency)}
                            </p>
                            <p className="truncate text-[13px] text-[#6B7280]">
                              {activityTitle(entry)}
                            </p>
                          </div>
                          <p className="shrink-0 text-[12px] text-[#9CA3AF]">
                            {relativeDay(entry.createdAt)}
                          </p>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </WalletCard>
            )}
          </div>

          <div>
            <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9B968D]">
              Quick actions
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {QUICK_ACTIONS.map((link) => {
                const Icon = link.icon;
                return (
                  <Link key={link.href} href={link.href}>
                    <WalletCard interactive className="flex h-full flex-col items-start gap-2 p-4">
                      <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#FFF1EA] text-[#D6480F]">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="text-[13px] font-semibold text-[#111827]">{link.label}</span>
                    </WalletCard>
                  </Link>
                );
              })}
            </div>
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
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
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
              <WalletButton variant="outline" size="md" onClick={() => setSelected(null)}>
                Close
              </WalletButton>
              <Link href="/wallet/transactions" className="flex-1">
                <WalletButton variant="primary" size="md" className="w-full">
                  All transactions
                </WalletButton>
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      {status === "error" ? null : (
        <button
          type="button"
          className="sr-only"
          onClick={() => {
            retry();
            retryLedger();
          }}
        >
          Refresh
        </button>
      )}
    </div>
  );
}
