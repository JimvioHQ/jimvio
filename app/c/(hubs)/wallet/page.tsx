"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Wallet, Loader2, Store, Users, Sparkles, History,
  ArrowUpRight, ChevronRight, TrendingUp,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { HubCard, HubLinkButton, HubSectionTitle, HubStatCard } from "@/components/community/hub/hub-ui";
import { cn } from "@/lib/utils";

type WalletData = {
  wallet: {
    available_balance: number;
    pending_balance: number;
    total_earned: number;
    currency: string;
    aggregation: {
      vendor: number;
      affiliate: number;
      creator: number;
      other: number;
    };
    recentTransactions: Array<{
      id: string;
      type: string;
      amount: number;
      description: string | null;
      created_at: string;
    }>;
  };
  earnings: {
    total: number;
    monthChangePct: number | null;
    currency: string;
  };
};

const TX_LABELS: Record<string, string> = {
  vendor_earning: "Product sale",
  affiliate_commission: "Affiliate commission",
  affiliate_earning: "Affiliate earning",
  community_earning: "Creator bonus",
};

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export default function HubWalletPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<WalletData | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/c/wallet");
        if (!res.ok) return;
        const json = (await res.json()) as WalletData;
        if (!cancelled) setData(json);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const currency = data?.wallet.currency ?? "USD";
  const agg = data?.wallet.aggregation;

  const sources = useMemo(
    () => [
      { label: "Sales", value: agg?.vendor ?? 0, icon: Store, color: "growth", bg: "bg-[var(--color-growth)]/15" },
      { label: "Affiliate", value: agg?.affiliate ?? 0, icon: Users, color: "live", bg: "bg-[var(--color-live)]/15" },
      { label: "Creator", value: agg?.creator ?? 0, icon: Sparkles, color: "events", bg: "bg-[var(--color-events)]/15" },
    ],
    [agg]
  );

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--color-text-muted)]" />
      </div>
    );
  }

  const wallet = data?.wallet;

  return (
    <div className="min-h-full bg-[var(--color-bg)]"
         style={{
           backgroundImage: `radial-gradient(circle at 50% -20%, var(--color-accent)/5, transparent 50%), radial-gradient(circle at 100% 100%, var(--color-social)/3, transparent 40%)`,
         }}>
      <div className="mx-auto flex max-w-[960px] flex-col gap-6 p-4 lg:p-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-black tracking-tight text-[var(--color-text-primary)]">
              <Wallet className="h-5 w-5 text-[var(--color-accent)]" />
              Wallet
            </h1>
            <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
              Your creator earnings and payouts
            </p>
          </div>
          <HubLinkButton href="/dashboard/wallet" variant="secondary">
            Manage payouts <ChevronRight className="ml-1 h-3.5 w-3.5" />
          </HubLinkButton>
        </div>

        {/* Hero balance card */}
        <div className="relative overflow-hidden rounded-2xl p-6 hover-lift animate-in animate-fade-in-up"
             style={{
               background: "linear-gradient(135deg, var(--color-accent), var(--color-accent-hover))",
             }}>
          <div className="absolute inset-0 -z-10 opacity-20 animate-blob"
               style={{ background: "radial-gradient(circle at 30% 70%, var(--color-social), transparent 50%)" }} />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-white/70">Available Balance</p>
              <p className="mt-1 text-[36px] font-black tracking-tight text-white">{formatMoney(wallet?.available_balance ?? 0, currency)}</p>
              {data?.earnings.monthChangePct != null && (
                <p className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-300">
                  <TrendingUp className="h-3 w-3" />
                  {data.earnings.monthChangePct >= 0 ? "+" : ""}{data.earnings.monthChangePct.toFixed(1)}% this month
                </p>
              )}
            </div>
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15">
              <Wallet className="h-8 w-8 text-white" />
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 animate-in stagger-children">
          <HubStatCard
            label="Pending"
            value={formatMoney(wallet?.pending_balance ?? 0, currency)}
            icon={<History className="h-4 w-4" />}
            accent="#f59e0b"
          />
          <HubStatCard
            label="Total earned"
            value={formatMoney(wallet?.total_earned ?? 0, currency)}
            icon={<ArrowUpRight className="h-4 w-4" />}
            accent="var(--color-accent)"
          />
          <HubStatCard
            label="This month"
            value={formatMoney(data?.earnings.total ?? 0, currency)}
            icon={<TrendingUp className="h-4 w-4" />}
            accent="#22c55e"
          />
        </div>

        {/* Earnings by source */}
        <div className="rounded-2xl border border-[var(--color-border)]/30 bg-[var(--color-surface)]/50 backdrop-blur p-4 hover-lift animate-in animate-fade-in-up">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[13px] font-black text-[var(--color-text-primary)]">Earnings by source</h3>
            <HubBadge variant="orange">Quick</HubBadge>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {sources.map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="flex items-center gap-3 rounded-xl border border-[var(--color-border)]/30 bg-[var(--color-surface)]/50 backdrop-blur p-3 hover-lift">
                <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl", bg, color)}>
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[14px] font-black text-[var(--color-text-primary)]">{formatMoney(value, currency)}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div className="rounded-2xl border border-[var(--color-border)]/30 bg-[var(--color-surface)]/50 backdrop-blur p-4 hover-lift animate-in animate-fade-in-up">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[13px] font-black text-[var(--color-text-primary)]">Recent activity</h3>
            <HubBadge variant="default">{String(wallet?.recentTransactions.length ?? 0)}</HubBadge>
          </div>
          {(wallet?.recentTransactions.length ?? 0) === 0 ? (
            <p className="py-6 text-center text-[12px] text-[var(--color-text-muted)]">
              No transactions yet. Start selling or sharing affiliate links to earn.
            </p>
          ) : (
            <div className="space-y-1">
              {wallet!.recentTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between gap-3 rounded-xl px-2 py-2.5 hover:bg-[var(--color-surface-secondary)] transition-colors">
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-semibold text-[var(--color-text-primary)]">
                      {tx.description ?? TX_LABELS[tx.type] ?? tx.type.replace(/_/g, " ")}
                    </p>
                    <p className="text-[10px] text-[var(--color-text-muted)]">
                      {formatDistanceToNow(new Date(tx.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <span className={cn("shrink-0 text-[12px] font-bold", tx.amount >= 0 ? "text-emerald-500" : "text-red-400")}>
                    {tx.amount >= 0 ? "+" : ""}{formatMoney(tx.amount, currency)}
                  </span>
                </div>
              ))}
            </div>
          )}
          <HubLinkButton href="/dashboard/wallet" variant="secondary" className="mt-3 w-full">
            View all transactions
          </HubLinkButton>
        </div>
      </div>
    </div>
  );
}