"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowUpRight,
  Bitcoin,
  Landmark,
  Settings2,
  Smartphone,
  Wallet,
  Zap,
} from "lucide-react";
import { formatMoneyAsUSD } from "@/lib/currency/platform";
import {
  normalizeWalletWithdrawalMethod,
  walletWithdrawalMethodLabel,
  withdrawalSpeedLabel,
  type WalletWithdrawalMethod,
} from "@/lib/payments/wallet-payout-method";
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

interface WithdrawalRecord {
  id: string;
  amount: number;
  currency?: string;
  method?: string;
  payoutMethod?: string | null;
  status: string;
  createdAt: string;
  reference?: string | null;
  providerReference?: string | null;
  payoutAccount?: string | null;
}

interface WalletWithdrawalsResponse {
  currency?: string;
  availableBalance?: number;
  withdrawals?: WithdrawalRecord[];
}

const METHODS: Array<{
  id: WalletWithdrawalMethod;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  accountLabel: string;
  accountPlaceholder: string;
  accountHint: string;
}> = [
  {
    id: "bank",
    label: "Bank transfer",
    icon: Landmark,
    description: withdrawalSpeedLabel("bank"),
    accountLabel: "Bank account details",
    accountPlaceholder: "Bank name, account number, account name",
    accountHint: "Include bank name, account number, and account holder name.",
  },
  {
    id: "flutterwave",
    label: "Flutterwave",
    icon: Zap,
    description: withdrawalSpeedLabel("flutterwave"),
    accountLabel: "Flutterwave payout destination",
    accountPlaceholder: "Account / phone linked to Flutterwave",
    accountHint: "Use the account you registered with Flutterwave payouts.",
  },
  {
    id: "mobile_money",
    label: "Mobile Money",
    icon: Smartphone,
    description: withdrawalSpeedLabel("mobile_money"),
    accountLabel: "Mobile money number",
    accountPlaceholder: "+2507…",
    accountHint: "Include country code. Operator must match your region.",
  },
  {
    id: "binance_id",
    label: "Binance ID",
    icon: Wallet,
    description: withdrawalSpeedLabel("binance_id"),
    accountLabel: "Binance ID",
    accountPlaceholder: "123456789",
    accountHint: "Your numeric Binance ID from the Binance app profile.",
  },
  {
    id: "crypto",
    label: "Cryptocurrency",
    icon: Bitcoin,
    description: withdrawalSpeedLabel("crypto"),
    accountLabel: "Wallet address (include network in notes if needed)",
    accountPlaceholder: "USDT TRC20 / BTC address",
    accountHint: "Double-check network and address — crypto payouts are irreversible.",
  },
];

const STATUS_FILTERS = ["all", "pending", "processing", "paid", "failed"] as const;

function mapUiStatus(status: string): string {
  const s = (status || "").toLowerCase();
  if (s === "completed") return "paid";
  return s;
}

export function WalletWithdrawalsClient() {
  const { status, data, error, retry } = useWalletFetch<WalletWithdrawalsResponse>("/api/wallet/os/withdrawals");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("all");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<WalletWithdrawalMethod>("bank");
  const [payoutAccount, setPayoutAccount] = useState("");
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const currency = data?.currency || "USD";
  const withdrawals = data?.withdrawals ?? [];
  const activeMethod = METHODS.find((m) => m.id === method) ?? METHODS[0];

  const filtered = useMemo(() => {
    if (statusFilter === "all") return withdrawals;
    return withdrawals.filter((w) => mapUiStatus(w.status) === statusFilter);
  }, [withdrawals, statusFilter]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = Number(amount);
    if (!parsed || parsed <= 0) {
      toast.error("Enter a valid withdrawal amount");
      return;
    }
    const canonical = normalizeWalletWithdrawalMethod(method);
    if (!canonical) {
      toast.error("Choose a supported payout method");
      return;
    }
    if (!payoutAccount.trim()) {
      toast.error(`Enter your ${activeMethod.accountLabel.toLowerCase()}`);
      return;
    }
    setSubmitting(true);
    try {
      const idempotencyKey =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${parsed}`;
      const res = await fetch("/api/wallet/os/withdrawals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          amount: parsed,
          payoutMethod: canonical,
          payoutAccount: payoutAccount.trim(),
          idempotencyKey,
          ...(pin ? { pin } : {}),
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(body?.error || "Withdrawal request failed");
      }
      toast.success(
        body?.duplicate
          ? "Withdrawal already submitted"
          : "Withdrawal request submitted — pending confirmation",
      );
      setAmount("");
      setPin("");
      setPayoutAccount("");
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
        description="Request a payout to a supported destination. Funds stay reserved until the payout is confirmed."
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[400px_minmax(0,1fr)]">
        <WalletCard className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9B968D]">
            Request withdrawal
          </p>
          {typeof data?.availableBalance === "number" && (
            <p className="mt-1 text-[13px] text-[#726D64]">
              Available to withdraw:{" "}
              <span className="font-semibold text-[#121113]">
                {formatMoneyAsUSD(data.availableBalance, currency)}
              </span>
            </p>
          )}
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-[#726D64]">Amount</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] text-[#B9B3A6]">
                  {currency}
                </span>
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
                      onClick={() => {
                        setMethod(m.id);
                        setPayoutAccount("");
                      }}
                      className={cn(
                        "flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors",
                        active
                          ? "border-[#FF5A1F]/60 bg-[#FFF6F1]"
                          : "border-black/[0.08] bg-white hover:border-black/15",
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0",
                          active ? "text-[#D6480F]" : "text-[#9B968D]",
                        )}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[12.5px] font-semibold text-[#121113]">
                          {m.label}
                        </span>
                        <span className="block text-[10.5px] text-[#9B968D]">{m.description}</span>
                      </span>
                      <span
                        className={cn(
                          "h-2 w-2 shrink-0 rounded-full",
                          active ? "bg-[#FF5A1F]" : "border border-black/15 bg-transparent",
                        )}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-[#726D64]">
                {activeMethod.accountLabel}
              </label>
              <input
                type="text"
                value={payoutAccount}
                onChange={(e) => setPayoutAccount(e.target.value)}
                placeholder={activeMethod.accountPlaceholder}
                required
                autoComplete="off"
                className="h-11 w-full rounded-xl border border-black/[0.08] bg-white px-3.5 text-[14px] text-[#121113] outline-none focus:border-[#FF5A1F]/50"
              />
              <p className="mt-1.5 text-[11px] text-[#9B968D]">{activeMethod.accountHint}</p>
            </div>

            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-[#726D64]">
                Wallet PIN (if set)
              </label>
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

            <WalletButton
              type="submit"
              variant="primary"
              size="lg"
              loading={submitting}
              className="w-full"
            >
              <ArrowUpRight className="h-4 w-4" />
              Request withdrawal
            </WalletButton>
            <p className="text-center text-[11px] text-[#9B968D]">
              Status stays pending until payout is confirmed. Never marked paid early.
            </p>
          </form>
        </WalletCard>

        <div className="space-y-6">
          <div>
            <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9B968D]">
              Payout methods
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {METHODS.map((m) => {
                const Icon = m.icon;
                return (
                  <WalletCard key={m.id} className="flex flex-col items-start gap-2 p-3.5">
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-black/[0.04] text-[#726D64]">
                      <Icon className="h-4 w-4" />
                    </span>
                    <p className="text-[12px] font-semibold text-[#121113]">{m.label}</p>
                    <p className="text-[10.5px] leading-snug text-[#9B968D]">{m.description}</p>
                  </WalletCard>
                );
              })}
            </div>
            <p className="mt-2 text-[11.5px] text-[#9B968D]">
              Save a default method in{" "}
              <Link
                href="/creator/payouts"
                className="font-semibold text-[#D6480F] underline underline-offset-2"
              >
                payout settings
              </Link>
              .
            </p>
          </div>

          <div>
            <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9B968D]">
                History
              </p>
              <div className="flex flex-wrap gap-1.5">
                {STATUS_FILTERS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatusFilter(s)}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize transition-colors",
                      statusFilter === s
                        ? "bg-[#121113] text-white"
                        : "border border-black/[0.06] bg-white text-[#726D64]",
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {status === "loading" && <WalletLoading label="Loading withdrawal history…" />}
            {status === "error" && (
              <WalletErrorState
                message={error || "The withdrawals endpoint isn't available yet."}
                onRetry={retry}
              />
            )}
            {(status === "empty" || (status === "ready" && filtered.length === 0)) && (
              <WalletEmptyState
                title="No withdrawals yet"
                description="Your withdrawal history will appear here."
              />
            )}
            {status === "ready" && filtered.length > 0 && (
              <div className="space-y-2">
                {filtered.map((w) => {
                  const methodKey = w.method || w.payoutMethod || "";
                  const methodMeta = METHODS.find((m) => m.id === methodKey);
                  const Icon = methodMeta?.icon ?? Landmark;
                  const displayStatus = mapUiStatus(w.status);
                  return (
                    <WalletCard key={w.id} className="flex items-center justify-between gap-3 p-3.5">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-black/[0.04] text-[#726D64]">
                          <Icon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-medium text-[#121113]">
                            {methodMeta?.label ?? walletWithdrawalMethodLabel(methodKey)}
                          </p>
                          <p className="text-[11px] text-[#9B968D]">
                            {new Date(w.createdAt).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                            {w.reference || w.providerReference
                              ? ` · ${w.reference || w.providerReference}`
                              : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <WalletPill tone={statusTone(displayStatus)}>{displayStatus}</WalletPill>
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
