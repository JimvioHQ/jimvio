"use client";

import Link from "next/link";
import {
  ArrowLeftRight,
  ArrowUpRight,
  BarChart3,
  Gift,
  ShieldCheck,
  Sparkles,
  Wallet as WalletIcon,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { WalletOsOverview } from "@/lib/wallet-os/types";
import {
  WalletButton,
  WalletCard,
  WalletEmptyState,
  WalletErrorState,
  WalletLoading,
  WalletSectionHeading,
  WalletStat,
  useWalletFetch,
} from "./wallet-ui";

type OverviewApiResponse = {
  overview?: WalletOsOverview;
  error?: string;
};

const QUICK_LINKS = [
  { href: "/wallet/transactions", label: "Transactions", description: "Every credit & debit", icon: ArrowLeftRight },
  { href: "/wallet/withdrawals", label: "Withdraw", description: "Send funds out", icon: ArrowUpRight },
  { href: "/wallet/deposits", label: "Add funds", description: "Top up your balance", icon: Sparkles },
  { href: "/wallet/analytics", label: "Analytics", description: "Income & growth", icon: BarChart3 },
  { href: "/wallet/security", label: "Security", description: "PIN, 2FA, devices", icon: ShieldCheck },
];

export function WalletOverviewClient() {
  const { status, data, error, retry } = useWalletFetch<OverviewApiResponse>(
    "/api/wallet/os/overview",
    {
      isEmpty: (json) => {
        const o = json?.overview;
        if (!o) return true;
        return (
          o.netWorth === 0 &&
          o.available === 0 &&
          o.pending === 0 &&
          o.totalEarned === 0
        );
      },
    }
  );

  const overview = data?.overview;
  const currency = overview?.currency || "USD";
  const totalBalance = overview?.netWorth ?? 0;
  const available = overview?.available ?? 0;
  const pending = overview?.pending ?? 0;
  const locked = overview?.locked ?? 0;
  const rewards = overview?.rewards ?? 0;
  const reserved = overview?.escrow ?? 0;
  const period = overview?.period;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pt-8">
      <WalletSectionHeading
        eyebrow="Jimvio Wallet"
        title="Overview"
        description="Your balance, activity, and money tools — in one place."
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/wallet/deposits">
              <WalletButton variant="outline" size="md">
                Add funds
              </WalletButton>
            </Link>
            <Link href="/wallet/withdrawals">
              <WalletButton variant="primary" size="md">
                <ArrowUpRight className="h-4 w-4" />
                Withdraw
              </WalletButton>
            </Link>
          </div>
        }
        className="mb-6"
      />

      {status === "loading" && <WalletLoading label="Loading your wallet…" />}
      {status === "error" && (
        <WalletErrorState message={error || "Could not load your wallet overview."} onRetry={retry} />
      )}

      {(status === "ready" || status === "empty") && (
        <div className="space-y-6">
          <WalletCard tone="ink" className="relative overflow-hidden p-6 sm:p-8">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(255,90,31,0.35),transparent_70%)] blur-2xl"
            />
            <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">
                  Total balance
                </p>
                <p className="mt-2 font-[var(--font-wallet-os-serif)] text-[44px] font-medium italic tracking-tight text-white sm:text-[56px]">
                  {formatCurrency(totalBalance, currency)}
                </p>
                <p className="mt-1 text-[13px] text-white/50">
                  Available {formatCurrency(available, currency)} · ready to withdraw
                </p>
              </div>
              <div className="flex flex-wrap gap-2.5">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-white/40">Available</p>
                  <p className="mt-0.5 text-[15px] font-semibold text-white">
                    {formatCurrency(available, currency)}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-white/40">Pending</p>
                  <p className="mt-0.5 text-[15px] font-semibold text-white">
                    {formatCurrency(pending, currency)}
                  </p>
                </div>
                {locked > 0 && (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-white/40">Locked</p>
                    <p className="mt-0.5 text-[15px] font-semibold text-white">
                      {formatCurrency(locked, currency)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </WalletCard>

          {status === "empty" && (
            <WalletEmptyState
              icon={<WalletIcon className="h-6 w-6" />}
              title="Your wallet is empty for now"
              description="Once you start earning across Jimvio, balances and activity will show up here automatically."
            />
          )}

          <div>
            <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9B968D]">
              Breakdown
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <WalletStat label="Available" value={formatCurrency(available, currency)} tone="accent" />
              <WalletStat label="Pending" value={formatCurrency(pending, currency)} tone="warning" />
              <WalletStat
                label="Rewards"
                value={formatCurrency(rewards, currency)}
                tone="success"
                icon={<Gift className="h-3.5 w-3.5" />}
              />
              {reserved > 0 ? (
                <WalletStat label="Reserved" value={formatCurrency(reserved, currency)} />
              ) : (
                <WalletStat label="Locked" value={formatCurrency(locked, currency)} />
              )}
            </div>
            {reserved > 0 && (
              <p className="mt-2 text-[12px] text-[#8B8579]">
                Reserved funds are held for in-progress orders or campaigns and are not part of Total balance.
              </p>
            )}
          </div>

          <div>
            <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9B968D]">
              Earnings
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <WalletStat
                label="Total earnings"
                value={formatCurrency(overview?.totalEarned ?? 0, currency)}
                icon={<Sparkles className="h-3.5 w-3.5" />}
              />
              <WalletStat label="This month" value={formatCurrency(period?.monthly ?? 0, currency)} />
              <WalletStat label="This week" value={formatCurrency(period?.weekly ?? 0, currency)} />
              <WalletStat label="Today" value={formatCurrency(period?.daily ?? 0, currency)} />
            </div>
          </div>

          <div>
            <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9B968D]">
              Quick links
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {QUICK_LINKS.map((link) => {
                const Icon = link.icon;
                return (
                  <Link key={link.href} href={link.href}>
                    <WalletCard interactive className="flex h-full flex-col gap-2.5 p-4">
                      <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#FFF1EA] text-[#D6480F]">
                        <Icon className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-[13.5px] font-semibold text-[#121113]">{link.label}</p>
                        <p className="mt-0.5 text-[11.5px] text-[#8B8579]">{link.description}</p>
                      </div>
                    </WalletCard>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
