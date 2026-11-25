"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Clock,
  Loader2,
  Megaphone,
  ShoppingBag,
  Sparkles,
  Users2,
  Wallet as WalletIcon,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { IdentityButton, IdentityCard, IdentityEmptyState, IdentityPill, cn } from "@/components/identity/identity-ui";

interface WalletTransaction {
  id: string;
  type: string;
  surface: "marketplace" | "affiliate" | "community" | "ugc" | "other";
  amount: number;
  currency: string;
  status: string;
  reference: string | null;
  createdAt: string;
}

interface WalletResponse {
  balance: number;
  pending: number;
  totalEarned: number;
  currency: string;
  aggregation: { marketplace: number; affiliate: number; community: number; ugc: number; other: number };
  transactions: WalletTransaction[];
  withdrawalUrl: string;
}

const SURFACE_META: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  marketplace: { label: "Marketplace sales", icon: ShoppingBag, color: "#2D7DD2" },
  affiliate: { label: "Affiliate commission", icon: Users2, color: "#8A6DF0" },
  community: { label: "Community bonuses", icon: Sparkles, color: "#D6A400" },
  ugc: { label: "UGC campaigns", icon: Megaphone, color: "#FF5A1F" },
  other: { label: "Other", icon: WalletIcon, color: "#9A9388" },
};

function BalanceCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "success" | "warning";
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4",
        tone === "success"
          ? "border-[#CFEFDA] bg-[#EAF7EE]"
          : tone === "warning"
            ? "border-[#FBE7AE] bg-[#FFF6E0]"
            : "border-black/[0.06] bg-white",
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9A9388]">{label}</p>
      <p className="mt-1 font-[var(--font-identity-serif)] text-[22px] font-medium text-[#161512]">{value}</p>
    </div>
  );
}

export function IdentityWalletClient() {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [data, setData] = useState<WalletResponse | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/identity/wallet")
      .then(async (res) => {
        if (!active) return;
        if (!res.ok) return setStatus("error");
        setData((await res.json()) as WalletResponse);
        setStatus("ready");
      })
      .catch(() => active && setStatus("error"));
    return () => {
      active = false;
    };
  }, []);

  if (status === "loading") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#FF5A1F]" />
      </div>
    );
  }

  if (status === "error" || !data) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24">
        <IdentityEmptyState title="Couldn't load your wallet" description="Please try again in a moment." />
      </div>
    );
  }

  const currency = data.currency || "USD";

  return (
    <div className="mx-auto max-w-4xl px-4 pb-24 pt-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9A9388]">Jimvio Identity</p>
          <h1 className="font-[var(--font-identity-serif)] text-[26px] font-medium tracking-tight text-[#161512]">
            Wallet
          </h1>
          <p className="mt-1 text-[13.5px] text-[#8B8579]">
            Every dollar you&apos;ve earned across Jimvio, in one place.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={data.withdrawalUrl}>
            <IdentityButton variant="outline">
              <ArrowUpRight className="h-4 w-4" /> Withdraw funds
            </IdentityButton>
          </Link>
          <Link href="/wallet">
            <IdentityButton>
              <WalletIcon className="h-4 w-4" /> Open Wallet
            </IdentityButton>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <BalanceCard label="Available balance" value={formatCurrency(data.balance, currency)} tone="success" />
        <BalanceCard label="Pending" value={formatCurrency(data.pending, currency)} tone="warning" />
        <BalanceCard label="Total earned" value={formatCurrency(data.totalEarned, currency)} />
      </div>

      <IdentityCard className="mt-5 p-5">
        <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9A9388]">Earning sources</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(Object.keys(SURFACE_META) as Array<keyof typeof SURFACE_META>)
            .filter((k) => k !== "other")
            .map((key) => {
              const meta = SURFACE_META[key];
              const Icon = meta.icon;
              const value = data.aggregation[key as keyof typeof data.aggregation] ?? 0;
              return (
                <div key={key} className="rounded-2xl border border-black/[0.06] bg-white p-3.5">
                  <div
                    className="mb-2 flex h-8 w-8 items-center justify-center rounded-full"
                    style={{ backgroundColor: `${meta.color}14`, color: meta.color }}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <p className="text-[14px] font-semibold text-[#1C1B19]">{formatCurrency(value, currency)}</p>
                  <p className="mt-0.5 text-[10.5px] text-[#9A9388]">{meta.label}</p>
                </div>
              );
            })}
        </div>
      </IdentityCard>

      <div className="mt-6 flex items-start gap-3 rounded-2xl border border-[#CFEFDA] bg-[#EAF7EE] p-4">
        <WalletIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#1C8A44]" />
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-semibold text-[#1C8A44]">Withdrawals happen from your main wallet</p>
          <p className="mt-0.5 text-[12px] leading-relaxed text-[#3E3A34]">
            This is a unified view of your Identity earnings. For the full experience — analytics, escrow, rewards,
            invoices and more — open{" "}
            <Link href="/wallet" className="font-semibold underline underline-offset-2">
              Wallet
            </Link>
            , or manage withdrawals directly in your{" "}
            <Link href={data.withdrawalUrl} className="font-semibold underline underline-offset-2">
              wallet & payout settings
            </Link>
            .
          </p>
        </div>
      </div>

      <div className="mt-6">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9A9388]">
          Recent transactions
        </p>
        {data.transactions.length === 0 ? (
          <IdentityEmptyState icon={<Clock className="h-6 w-6" />} title="No transactions yet" />
        ) : (
          <div className="space-y-2">
            {data.transactions.slice(0, 25).map((tx) => {
              const meta = SURFACE_META[tx.surface] ?? SURFACE_META.other;
              const Icon = meta.icon;
              return (
                <IdentityCard key={tx.id} className="flex items-center justify-between gap-3 p-3.5">
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                      style={{ backgroundColor: `${meta.color}14`, color: meta.color }}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-[#1C1B19]">{meta.label}</p>
                      <p className="text-[11px] text-[#9A9388]">
                        {new Date(tx.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <IdentityPill tone={tx.status === "completed" || tx.status === "paid" ? "success" : "warning"}>{tx.status}</IdentityPill>
                    <span className={cn("text-[13px] font-semibold", "text-[#1C8A44]")}>
                      +{formatCurrency(tx.amount, tx.currency)}
                    </span>
                  </div>
                </IdentityCard>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
