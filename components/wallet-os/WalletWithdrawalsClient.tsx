"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowUpRight, Bitcoin, CreditCard, Landmark, Settings2, Smartphone, Zap } from "lucide-react";
import { formatMoneyAsUSD } from "@/lib/currency/platform";
import {
  WalletButton,
  WalletCard,
  WalletEmptyState,
  WalletErrorState,
  WalletLoading,
  WalletPill,
  WalletSectionHeading,
  cn,
  statusTone,
  useWalletFetch,
} from "./wallet-ui";

type WithdrawalMethodId = "bank" | "flutterwave" | "mobile_money" | "paypal" | "crypto";

interface WithdrawalRecord {
  id: string;
  amount: number;
  currency?: string;
  method: WithdrawalMethodId | string;
  status: string;
  createdAt: string;
  reference?: string | null;
}

interface WalletWithdrawalsResponse {
  currency?: string;
  availableBalance?: number;
  withdrawals?: WithdrawalRecord[];
}

const METHODS: Array<{ id: WithdrawalMethodId; label: string; icon: React.ComponentType<{ className?: string }>; description: string }> = [
  { id: "bank", label: "Bank transfer", icon: Landmark, description: "2–3 business days" },
  { id: "flutterwave", label: "Flutterwave", icon: Zap, description: "Africa payouts" },
  { id: "mobile_money", label: "Mobile Money", icon: Smartphone, description: "Instant to wallet" },
  { id: "paypal", label: "PayPal", icon: CreditCard, description: "Global, fast" },
  { id: "crypto", label: "Crypto", icon: Bitcoin, description: "USDT / BTC" },
];

const STATUS_FILTERS = ["all", "pending", "processing", "completed", "failed"] as const;

export function WalletWithdrawalsClient() {
  const { status, data, error, retry } = useWalletFetch<WalletWithdrawalsResponse>("/api/wallet/os/withdrawals");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("all");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<WithdrawalMethodId>("bank");
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const currency = data?.currency || "USD";
  const withdrawals = data?.withdrawals ?? [];

  const filtered = useMemo(() => {
    if (statusFilter === "all") return withdrawals;
    return withdrawals.filter((w) => (w.status || "").toLowerCase() === statusFilter);
  }, [withdrawals, statusFilter]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = Number(amount);
    if (!parsed || parsed <= 0) {
      toast.error("Enter a valid withdrawal amount");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/wallet/os/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: parsed, method, ...(pin ? { pin } : {}) }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Withdrawal request failed");
      }
      toast.success("Withdrawal request submitted");
      setAmount("");
      setPin("");
      retry();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't submit withdrawal request");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pt-8">
      <WalletSectionHeading
        eyebrow="Jimvio Wallet"
        title="Withdrawals"
        description="One place to withdraw everything you've earned, however you like to get paid."
        action={
          <Link href="/creator/payouts">
            <WalletButton variant="outline" size="md">
              <Settings2 className="h-4 w-4" />
              Payout methods
            </WalletButton>
          </Link>
        }
        className="mb-6"
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
        {/* Request form */}
        <WalletCard className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9B968D]">Request withdrawal</p>
          {typeof data?.availableBalance === "number" && (
            <p className="mt-1 text-[13px] text-[#726D64]">
              Available to withdraw: <span className="font-semibold text-[#121113]">{formatMoneyAsUSD(data.availableBalance, currency)}</span>
            </p>
          )}
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-[#726D64]">Amount</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] text-[#B9B3A6]">{currency}</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  required
                  className="h-11 w-full rounded-xl border border-black/[0.08] bg-white pl-14 pr-3 text-[14px] font-medium text-[#121113] outline-none focus:border-[#FF5A1F]/50"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-[#726D64]">Method</label>
              <div className="grid grid-cols-1 gap-1.5">
                {METHODS.map((m) => {
                  const Icon = m.icon;
                  const active = method === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMethod(m.id)}
                      className={cn(
                        "flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors",
                        active ? "border-[#FF5A1F]/60 bg-[#FFF6F1]" : "border-black/[0.08] bg-white hover:border-black/15",
                      )}
                    >
                      <Icon className={cn("h-4 w-4 shrink-0", active ? "text-[#D6480F]" : "text-[#9B968D]")} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[12.5px] font-semibold text-[#121113]">{m.label}</span>
                        <span className="block text-[10.5px] text-[#9B968D]">{m.description}</span>
                      </span>
                      <span
                        className={cn(
                          "h-2 w-2 shrink-0 rounded-full",
                          active ? "bg-[#FF5A1F]" : "bg-transparent border border-black/15",
                        )}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-[#726D64]">Wallet PIN (optional)</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••"
                className="h-11 w-full rounded-xl border border-black/[0.08] bg-white px-3.5 text-[14px] tracking-widest text-[#121113] outline-none focus:border-[#FF5A1F]/50"
              />
            </div>

            <WalletButton type="submit" variant="primary" size="lg" loading={submitting} className="w-full">
              <ArrowUpRight className="h-4 w-4" />
              Request withdrawal
            </WalletButton>
          </form>
        </WalletCard>

        {/* Methods + history */}
        <div className="space-y-6">
          <div>
            <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9B968D]">Payout methods</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {METHODS.map((m) => {
                const Icon = m.icon;
                return (
                  <WalletCard key={m.id} className="flex flex-col items-start gap-2 p-3.5">
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-black/[0.04] text-[#726D64]">
                      <Icon className="h-4 w-4" />
                    </span>
                    <p className="text-[12px] font-semibold text-[#121113]">{m.label}</p>
                  </WalletCard>
                );
              })}
            </div>
            <p className="mt-2 text-[11.5px] text-[#9B968D]">
              Add or verify a method in{" "}
              <Link href="/creator/payouts" className="font-semibold text-[#D6480F] underline underline-offset-2">
                payout settings
              </Link>
              .
            </p>
          </div>

          <div>
            <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9B968D]">History</p>
              <div className="flex flex-wrap gap-1.5">
                {STATUS_FILTERS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatusFilter(s)}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize transition-colors",
                      statusFilter === s ? "bg-[#121113] text-white" : "bg-white text-[#726D64] border border-black/[0.06]",
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {status === "loading" && <WalletLoading label="Loading withdrawal history…" />}
            {status === "error" && (
              <WalletErrorState message={error || "The withdrawals endpoint isn't available yet."} onRetry={retry} />
            )}
            {(status === "empty" || (status === "ready" && filtered.length === 0)) && (
              <WalletEmptyState title="No withdrawals yet" description="Your withdrawal history will appear here." />
            )}
            {status === "ready" && filtered.length > 0 && (
              <div className="space-y-2">
                {filtered.map((w) => {
                  const methodMeta = METHODS.find((m) => m.id === w.method);
                  const Icon = methodMeta?.icon ?? Landmark;
                  return (
                    <WalletCard key={w.id} className="flex items-center justify-between gap-3 p-3.5">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-black/[0.04] text-[#726D64]">
                          <Icon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-medium text-[#121113]">
                            {methodMeta?.label ?? w.method}
                          </p>
                          <p className="text-[11px] text-[#9B968D]">
                            {new Date(w.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                            {w.reference ? ` · ${w.reference}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <WalletPill tone={statusTone(w.status)}>{w.status}</WalletPill>
                        <span className="text-[13px] font-semibold text-[#121113]">
                          {formatMoneyAsUSD(w.amount, w.currency || currency)}
                        </span>
                      </div>
                    </WalletCard>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
