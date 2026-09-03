"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Bitcoin, CreditCard, Landmark, PlusCircle, Smartphone, Zap } from "lucide-react";
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

type DepositMethodId = "bank" | "flutterwave" | "mobile_money" | "paypal" | "crypto";

interface DepositRecord {
  id: string;
  amount: number;
  currency?: string;
  method: DepositMethodId | string;
  status: string;
  createdAt: string;
  reference?: string | null;
}

interface WalletDepositsResponse {
  currency?: string;
  deposits?: DepositRecord[];
}

const METHODS: Array<{ id: DepositMethodId; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: "bank", label: "Bank transfer", icon: Landmark },
  { id: "flutterwave", label: "Flutterwave", icon: Zap },
  { id: "mobile_money", label: "Mobile Money", icon: Smartphone },
  { id: "paypal", label: "PayPal", icon: CreditCard },
  { id: "crypto", label: "Crypto", icon: Bitcoin },
];

export function WalletDepositsClient() {
  const { status, data, error, retry } = useWalletFetch<WalletDepositsResponse>("/api/wallet/os/deposits");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<DepositMethodId>("bank");
  const [submitting, setSubmitting] = useState(false);

  const currency = data?.currency || "USD";
  const deposits = data?.deposits ?? [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = Number(amount);
    if (!parsed || parsed <= 0) {
      toast.error("Enter a valid deposit amount");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/wallet/os/deposits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: parsed, method }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Deposit request failed");
      }
      toast.success("Deposit request created");
      setAmount("");
      retry();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't submit deposit request");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pt-8">
      <WalletSectionHeading
        eyebrow="Jimvio Wallet"
        title="Deposits"
        description="Fund your wallet directly, or track incoming funding requests."
        className="mb-6"
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
        <WalletCard className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9B968D]">Request deposit</p>
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
              <label className="mb-1.5 block text-[12px] font-medium text-[#726D64]">Fund with</label>
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
                      <span className="flex-1 text-[12.5px] font-semibold text-[#121113]">{m.label}</span>
                      <span className={cn("h-2 w-2 shrink-0 rounded-full", active ? "bg-[#FF5A1F]" : "border border-black/15")} />
                    </button>
                  );
                })}
              </div>
            </div>
            <WalletButton type="submit" variant="primary" size="lg" loading={submitting} className="w-full">
              <PlusCircle className="h-4 w-4" />
              Request deposit
            </WalletButton>
          </form>
        </WalletCard>

        <div>
          <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9B968D]">Funding history</p>
          {status === "loading" && <WalletLoading label="Loading deposit history…" />}
          {status === "error" && (
            <WalletErrorState message={error || "The deposits endpoint isn't available yet."} onRetry={retry} />
          )}
          {(status === "empty" || (status === "ready" && deposits.length === 0)) && (
            <WalletEmptyState title="No deposits yet" description="Your funding history will appear here once you add funds." />
          )}
          {status === "ready" && deposits.length > 0 && (
            <div className="space-y-2">
              {deposits.map((d) => {
                const methodMeta = METHODS.find((m) => m.id === d.method);
                const Icon = methodMeta?.icon ?? Landmark;
                return (
                  <WalletCard key={d.id} className="flex items-center justify-between gap-3 p-3.5">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-black/[0.04] text-[#726D64]">
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium text-[#121113]">{methodMeta?.label ?? d.method}</p>
                        <p className="text-[11px] text-[#9B968D]">
                          {new Date(d.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                          {d.reference ? ` · ${d.reference}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <WalletPill tone={statusTone(d.status)}>{d.status}</WalletPill>
                      <span className="text-[13px] font-semibold text-[#1C8A44]">+{formatMoneyAsUSD(d.amount, d.currency || currency)}</span>
                    </div>
                  </WalletCard>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
