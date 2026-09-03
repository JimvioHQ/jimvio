"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PlusCircle } from "lucide-react";
import { formatMoneyAsUSD, PLATFORM_CURRENCY } from "@/lib/currency/platform";
import {
  PaymentMethodSelector,
  type MethodId,
} from "@/components/checkout/PaymentMethodSelector";
import {
  WalletButton,
  WalletCard,
  WalletEmptyState,
  WalletErrorState,
  WalletLoading,
  WalletPill,
  WalletSectionHeading,
  statusTone,
  useWalletFetch,
} from "./wallet-ui";

interface DepositRecord {
  id: string;
  amount: number;
  currency?: string;
  method: string;
  status: string;
  createdAt: string;
  reference?: string | null;
}

interface WalletDepositsResponse {
  currency?: string;
  availableBalance?: number;
  deposits?: DepositRecord[];
}

export function WalletDepositsClient() {
  const { status, data, error, retry } = useWalletFetch<WalletDepositsResponse>("/api/wallet/os/deposits");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<MethodId>("flutterwave");
  const [enabledMethods, setEnabledMethods] = useState<MethodId[] | undefined>();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/platform/payment-providers")
      .then((r) => r.json())
      .then((body: { enabled?: MethodId[] }) => {
        if (Array.isArray(body.enabled) && body.enabled.length > 0) {
          setEnabledMethods(body.enabled);
          setMethod((current) =>
            body.enabled!.includes(current) ? current : body.enabled![0],
          );
        }
      })
      .catch(() => undefined);
  }, []);

  const currency = data?.currency || PLATFORM_CURRENCY;
  const deposits = data?.deposits ?? [];
  const available = Number(data?.availableBalance ?? 0);
  const parsedAmount = useMemo(() => Math.round(Number(amount) * 100) / 100, [amount]);

  async function handlePay() {
    if (!Number.isFinite(parsedAmount) || parsedAmount < 1) {
      toast.error("Enter a valid deposit amount (minimum $1.00)");
      return;
    }
    if (!method) {
      toast.error("Choose a payment method");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/wallet/os/deposits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: parsedAmount, method }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(body?.error || "Deposit request failed");
      }
      if (body?.checkoutUrl) {
        window.location.href = body.checkoutUrl;
        return;
      }
      toast.success("Deposit request created. Complete payment when prompted.");
      setAmount("");
      retry();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't start deposit");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pt-8">
      <WalletSectionHeading
        eyebrow="Wallet"
        title="Add funds"
        description="Fund your Jimvio wallet with the same secure payment methods used at checkout."
        className="mb-6"
      />

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <WalletCard className="p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9B968D]">
            Available balance
          </p>
          <p className="mt-1 text-[22px] font-bold tabular-nums text-[#121113]">
            {formatMoneyAsUSD(available, currency)}
          </p>
        </WalletCard>
        <WalletCard className="p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9B968D]">
            Deposit amount
          </p>
          <div className="relative mt-2">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] text-[#B9B3A6]">$</span>
            <input
              type="number"
              min={1}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="50.00"
              className="h-11 w-full rounded-xl border border-black/[0.08] bg-white pl-8 pr-3 text-[14px] font-medium text-[#121113] outline-none focus:border-[#FF5A1F]/50"
            />
          </div>
        </WalletCard>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <WalletCard className="p-5">
          {status === "loading" ? (
            <WalletLoading />
          ) : status === "error" ? (
            <WalletErrorState message={error || "Could not load deposits"} onRetry={retry} />
          ) : (
            <PaymentMethodSelector
              selected={method}
              onSelect={setMethod}
              orderTotal={Number.isFinite(parsedAmount) && parsedAmount > 0 ? parsedAmount : 0}
              orderCurrency={PLATFORM_CURRENCY}
              enabledMethodIds={enabledMethods}
              loading={submitting}
              onPay={handlePay}
            />
          )}
        </WalletCard>

        <WalletCard className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9B968D]">
            Recent deposits
          </p>
          {deposits.length === 0 ? (
            <WalletEmptyState
              icon={<PlusCircle className="h-6 w-6" />}
              title="No deposits yet"
              description="Add funds to pay for campaigns and other Jimvio features from your balance."
            />
          ) : (
            <ul className="mt-4 space-y-2.5">
              {deposits.map((d) => (
                <li
                  key={d.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-black/[0.06] px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-[#121113]">
                      {formatMoneyAsUSD(d.amount, d.currency || currency)}
                    </p>
                    <p className="text-[11px] text-[#9B968D]">
                      {d.method} · {new Date(d.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <WalletPill tone={statusTone(d.status)}>{d.status}</WalletPill>
                </li>
              ))}
            </ul>
          )}
          <WalletButton variant="ghost" className="mt-4 w-full" onClick={() => retry()}>
            Refresh
          </WalletButton>
        </WalletCard>
      </div>
    </div>
  );
}
