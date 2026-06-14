"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Wallet, Loader2, Store, Users, Sparkles, History,
  ArrowUpRight, ChevronRight,
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
      { label: "Sales", value: agg?.vendor ?? 0, icon: Store, color: "text-sky-600", bg: "bg-sky-500/10" },
      { label: "Affiliate", value: agg?.affiliate ?? 0, icon: Users, color: "text-violet-600", bg: "bg-violet-500/10" },
      { label: "Creator", value: agg?.creator ?? 0, icon: Sparkles, color: "text-amber-600", bg: "bg-amber-500/10" },
    ],
    [agg]
  );

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  const wallet = data?.wallet;

  return (
    <div className="min-h-full bg-[var(--color-bg,#f4f4f5)]">
      <div className="mx-auto max-w-[960px] space-y-4 p-4 lg:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-black tracking-tight">
              <Wallet className="h-5 w-5 text-[#fd5000]" />
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

        <div className="grid gap-3 sm:grid-cols-3">
          <HubStatCard
            label="Available"
            value={formatMoney(wallet?.available_balance ?? 0, currency)}
            icon={<Wallet className="h-4 w-4" />}
            accent="#22c55e"
          />
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
            accent="#fd5000"
          />
        </div>

        <HubCard>
          <HubSectionTitle title="Earnings by source" />
          <div className="grid gap-2 sm:grid-cols-3">
            {sources.map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] p-3">
                <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl", bg, color)}>
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[14px] font-black">{formatMoney(value, currency)}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </HubCard>

        <HubCard>
          <HubSectionTitle title="Recent activity" badge={String(wallet?.recentTransactions.length ?? 0)} />
          {(wallet?.recentTransactions.length ?? 0) === 0 ? (
            <p className="py-6 text-center text-[12px] text-[var(--color-text-muted)]">
              No transactions yet. Start selling or sharing affiliate links to earn.
            </p>
          ) : (
            <div className="space-y-1">
              {wallet!.recentTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between gap-3 rounded-xl px-2 py-2.5 hover:bg-[var(--color-surface-secondary)]">
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-semibold">
                      {tx.description ?? TX_LABELS[tx.type] ?? tx.type.replace(/_/g, " ")}
                    </p>
                    <p className="text-[10px] text-[var(--color-text-muted)]">
                      {formatDistanceToNow(new Date(tx.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <span className={cn("shrink-0 text-[12px] font-bold", tx.amount >= 0 ? "text-emerald-600" : "text-red-500")}>
                    {tx.amount >= 0 ? "+" : ""}{formatMoney(tx.amount, currency)}
                  </span>
                </div>
              ))}
            </div>
          )}
          <HubLinkButton href="/dashboard/wallet" variant="secondary" className="mt-3 w-full">
            View all transactions
          </HubLinkButton>
        </HubCard>
      </div>
    </div>
  );
}
