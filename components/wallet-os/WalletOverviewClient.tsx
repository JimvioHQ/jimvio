"use client";

import Link from "next/link";
import {
  ArrowLeftRight,
  ArrowUpRight,
  BarChart3,
  Gift,
  Lock,
  ShieldCheck,
  Sparkles,
  Wallet as WalletIcon,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
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

interface WalletOverviewResponse {
  currency?: string;
  balances?: {
    current?: number;
    pending?: number;
    locked?: number;
    escrow?: number;
    rewards?: number;
    available?: number;
  };
  earnings?: {
    total?: number;
    monthly?: number;
    weekly?: number;
    daily?: number;
  };
}

const QUICK_LINKS = [
  { href: "/wallet/transactions", label: "Transactions", description: "Every credit & debit", icon: ArrowLeftRight },
  { href: "/wallet/withdrawals", label: "Withdraw", description: "Send funds out", icon: ArrowUpRight },
  { href: "/wallet/escrow", label: "Escrow", description: "Locked & released", icon: Lock },
  { href: "/wallet/analytics", label: "Analytics", description: "Income & growth", icon: BarChart3 },
  { href: "/wallet/security", label: "Security", description: "PIN, 2FA, devices", icon: ShieldCheck },
];

export function WalletOverviewClient() {
  const { status, data, error, retry } = useWalletFetch<WalletOverviewResponse>("/api/wallet/os/overview");

  const currency = data?.currency || "USD";
  const b = data?.balances || {};
  const e = data?.earnings || {};

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pt-8">
      <WalletSectionHeading
        eyebrow="Jimvio Wallet OS"
        title="Overview"
        description="Everything you earn, hold, and move across Jimvio — in one place."
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
        <WalletErrorState message={error || "The Wallet OS overview endpoint isn't available yet."} onRetry={retry} />
      )}

      {(status === "ready" || status === "empty") && (
        <div className="space-y-6">
          {/* Hero balance card */}
          <WalletCard tone="ink" className="relative overflow-hidden p-6 sm:p-8">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(255,90,31,0.35),transparent_70%)] blur-2xl"
            />
            <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">Available now</p>
                <p className="mt-2 font-[var(--font-wallet-os-serif)] text-[44px] font-medium italic tracking-tight text-white sm:text-[56px]">
                  {formatCurrency(b.available ?? 0, currency)}
                </p>
                <p className="mt-1 text-[13px] text-white/50">
                  Current balance {formatCurrency(b.current ?? 0, currency)} · ready to withdraw anytime
                </p>
              </div>
              <div className="flex flex-wrap gap-2.5">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-white/40">Pending</p>
                  <p className="mt-0.5 text-[15px] font-semibold text-white">{formatCurrency(b.pending ?? 0, currency)}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-white/40">Locked</p>
                  <p className="mt-0.5 text-[15px] font-semibold text-white">{formatCurrency(b.locked ?? 0, currency)}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-white/40">Escrow</p>
                  <p className="mt-0.5 text-[15px] font-semibold text-white">{formatCurrency(b.escrow ?? 0, currency)}</p>
                </div>
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

          {/* Balance breakdown */}
          <div>
            <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9B968D]">Balances</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <WalletStat label="Current" value={formatCurrency(b.current ?? 0, currency)} />
              <WalletStat label="Available" value={formatCurrency(b.available ?? 0, currency)} tone="accent" />
              <WalletStat label="Pending" value={formatCurrency(b.pending ?? 0, currency)} tone="warning" />
              <WalletStat label="Locked" value={formatCurrency(b.locked ?? 0, currency)} />
              <WalletStat label="Escrow" value={formatCurrency(b.escrow ?? 0, currency)} />
              <WalletStat label="Rewards" value={formatCurrency(b.rewards ?? 0, currency)} tone="success" icon={<Gift className="h-3.5 w-3.5" />} />
            </div>
          </div>

          {/* Earnings breakdown */}
          <div>
            <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9B968D]">Earnings</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <WalletStat label="Total earnings" value={formatCurrency(e.total ?? 0, currency)} icon={<Sparkles className="h-3.5 w-3.5" />} />
              <WalletStat label="This month" value={formatCurrency(e.monthly ?? 0, currency)} />
              <WalletStat label="This week" value={formatCurrency(e.weekly ?? 0, currency)} />
              <WalletStat label="Today" value={formatCurrency(e.daily ?? 0, currency)} />
            </div>
          </div>

          {/* Quick links */}
          <div>
            <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9B968D]">Quick links</p>
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
