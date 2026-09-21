"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { PlusCircle } from "lucide-react";
import { formatMoneyAsUSD, PLATFORM_CURRENCY } from "@/lib/currency/platform";
import {
  PaymentMethodSelector,
  type MethodId,
} from "@/components/checkout/PaymentMethodSelector";
import {
  MobileMoneyPaymentStep,
  type MoMoFormState,
} from "@/components/checkout/MobileMoneyCheckoutPanel";
import {
  isWalletDepositInitiable,
  walletDepositMethodLabel,
  WALLET_DEPOSIT_INITIABLE_METHODS,
} from "@/lib/payments/wallet-deposit-method";
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
  methodLabel?: string;
  status: string;
  createdAt: string;
  reference?: string | null;
}

interface WalletDepositsResponse {
  currency?: string;
  availableBalance?: number;
  deposits?: DepositRecord[];
  supportedMethods?: string[];
}

type Stage = "methods" | "mobile_money";

/** Only methods with real deposit initiate + verify paths. */
const DEPOSIT_METHOD_SET = new Set<string>(WALLET_DEPOSIT_INITIABLE_METHODS);

function extractRedirectUrl(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  for (const key of ["redirectUrl", "checkoutUrl", "checkout_url", "link"]) {
    const v = d[key];
    if (typeof v === "string" && v.startsWith("https://")) return v;
  }
  return null;
}

function extractErrorMessage(data: unknown): string {
  if (!data || typeof data !== "object") return "Couldn't start deposit";
  const d = data as Record<string, unknown>;
  if (typeof d.error === "string" && d.error.trim()) return d.error;
  if (typeof d.message === "string" && d.message.trim()) return d.message;
  return "Couldn't start deposit";
}

export function WalletDepositsClient() {
  const { status, data, error, retry } = useWalletFetch<WalletDepositsResponse>("/api/wallet/os/deposits");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<MethodId>("flutterwave");
  const [stage, setStage] = useState<Stage>("methods");
  const [enabledMethods, setEnabledMethods] = useState<MethodId[] | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [momoForm, setMomoForm] = useState<MoMoFormState>({
    country: "",
    network: "",
    phone: "",
  });
  const [momoError, setMomoError] = useState<string | null>(null);
  const [momoAwaiting, setMomoAwaiting] = useState(false);
  const momoPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const momoPollCountRef = useRef(0);

  useEffect(() => {
    fetch("/api/platform/payment-providers")
      .then((r) => r.json())
      .then((body: { enabled?: MethodId[] }) => {
        const configured = Array.isArray(body.enabled) ? body.enabled : [];
        const depositReady = configured.filter(
          (id) => DEPOSIT_METHOD_SET.has(id) && isWalletDepositInitiable(id),
        ) as MethodId[];
        if (depositReady.length > 0) {
          setEnabledMethods(depositReady);
          setMethod((current) =>
            depositReady.includes(current) ? current : depositReady[0],
          );
        } else {
          setEnabledMethods([...WALLET_DEPOSIT_INITIABLE_METHODS] as MethodId[]);
        }
      })
      .catch(() => {
        setEnabledMethods([...WALLET_DEPOSIT_INITIABLE_METHODS] as MethodId[]);
      });
  }, []);

  useEffect(() => {
    return () => {
      if (momoPollRef.current) clearInterval(momoPollRef.current);
    };
  }, []);

  const currency = data?.currency || PLATFORM_CURRENCY;
  const deposits = data?.deposits ?? [];
  const available = Number(data?.availableBalance ?? 0);
  const parsedAmount = useMemo(() => Math.round(Number(amount) * 100) / 100, [amount]);

  const backToMethods = useCallback(() => {
    if (momoPollRef.current) clearInterval(momoPollRef.current);
    setMomoAwaiting(false);
    setMomoError(null);
    setStage("methods");
  }, []);

  async function handleCardOrCryptoPay() {
    if (!Number.isFinite(parsedAmount) || parsedAmount < 1) {
      toast.error("Enter a valid deposit amount (minimum $1.00)");
      return;
    }
    if (!method || method === "mobile_money") {
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
        throw new Error(extractErrorMessage(body));
      }
      const checkoutUrl = extractRedirectUrl(body);
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
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

  async function handleMobileMoneyPay() {
    if (!Number.isFinite(parsedAmount) || parsedAmount < 1) {
      setMomoError("Enter a valid deposit amount (minimum $1.00)");
      return;
    }
    if (!momoForm.country) {
      setMomoError("Mobile Money is not available in this country.");
      return;
    }
    if (!momoForm.phone.trim()) {
      setMomoError("Please enter a valid Mobile Money number.");
      return;
    }

    setSubmitting(true);
    setMomoError(null);
    try {
      const res = await fetch("/api/wallet/os/deposits/mobile-money/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parsedAmount,
          country: momoForm.country,
          network: momoForm.network || undefined,
          phone: momoForm.phone,
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = extractErrorMessage(body);
        setMomoError(msg);
        throw new Error(msg);
      }

      const redirectUrl = extractRedirectUrl(body);
      if (redirectUrl) {
        if (!redirectUrl.startsWith("https://")) {
          throw new Error("Invalid payment redirect");
        }
        // Never allow hosted card checkout for Mobile Money deposits.
        if (redirectUrl.includes("checkout.flutterwave.com/v3/hosted/pay")) {
          setMomoError("Mobile Money could not start. Please try again.");
          throw new Error("Invalid Mobile Money redirect");
        }
        window.location.href = redirectUrl;
        return;
      }

      const depositId = typeof body?.depositId === "string" ? body.depositId : "";
      const txRef = typeof body?.txRef === "string" ? body.txRef : "";
      if (!depositId || !txRef) {
        throw new Error("We couldn't start the Mobile Money payment.");
      }

      const pollUrl =
        typeof body?.pollUrl === "string"
          ? body.pollUrl
          : `/api/wallet/os/deposits/mobile-money/status?depositId=${encodeURIComponent(depositId)}&txRef=${encodeURIComponent(txRef)}`;

      setMomoAwaiting(true);
      toast.message(
        typeof body?.message === "string" && body.message
          ? body.message
          : "Waiting for Mobile Money authorization…",
      );

      if (momoPollRef.current) clearInterval(momoPollRef.current);
      momoPollCountRef.current = 0;
      const MAX_POLLS = 60;

      await new Promise<void>((resolve, reject) => {
        momoPollRef.current = setInterval(async () => {
          momoPollCountRef.current += 1;
          if (momoPollCountRef.current > MAX_POLLS) {
            if (momoPollRef.current) clearInterval(momoPollRef.current);
            setMomoAwaiting(false);
            reject(new Error("The payment expired. Please try again."));
            return;
          }
          try {
            const st = await fetch(pollUrl);
            const json = await st.json();
            if (json.status === "successful") {
              if (momoPollRef.current) clearInterval(momoPollRef.current);
              setMomoAwaiting(false);
              toast.success("Deposit completed. Your wallet has been credited.");
              setAmount("");
              setStage("methods");
              retry();
              resolve();
              return;
            }
            if (json.status === "failed" || json.status === "cancelled") {
              if (momoPollRef.current) clearInterval(momoPollRef.current);
              setMomoAwaiting(false);
              reject(
                new Error(
                  json.message ||
                    (json.status === "cancelled"
                      ? "The payment was cancelled."
                      : "The payment failed."),
                ),
              );
            }
          } catch {
            // Transient — keep polling; webhook may still finalize.
          }
        }, 5000);
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Couldn't start deposit";
      setMomoError(msg);
      toast.error(msg);
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
            Total balance
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
              disabled={stage === "mobile_money" && (submitting || momoAwaiting)}
              className="h-11 w-full rounded-xl border border-black/[0.08] bg-white pl-8 pr-3 text-[14px] font-medium text-[#121113] outline-none focus:border-[#FF5A1F]/50 disabled:opacity-60"
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
          ) : stage === "mobile_money" ? (
            <MobileMoneyPaymentStep
              amountUsd={Number.isFinite(parsedAmount) && parsedAmount > 0 ? parsedAmount : 0}
              formatMoney={(amt, cur) => formatMoneyAsUSD(amt, cur)}
              preferredPhone={null}
              value={momoForm}
              onChange={setMomoForm}
              onBack={backToMethods}
              onContinue={() => void handleMobileMoneyPay()}
              submitting={submitting}
              awaitingConfirmation={momoAwaiting}
              error={momoError}
              title="Mobile Money"
              subtitle="Pay securely using your local mobile wallet."
              amountLabel="Deposit amount"
              continueLabel="Continue with Mobile Money"
              secureNote="Your wallet is credited only after payment is verified."
            />
          ) : (
            <PaymentMethodSelector
              selected={method === "mobile_money" ? null : method}
              onSelect={(id) => {
                if (id === "mobile_money") {
                  if (!Number.isFinite(parsedAmount) || parsedAmount < 1) {
                    toast.error("Enter a valid deposit amount (minimum $1.00)");
                    return;
                  }
                  setMethod("mobile_money");
                  setMomoError(null);
                  setStage("mobile_money");
                  return;
                }
                setMethod(id);
              }}
              orderTotal={Number.isFinite(parsedAmount) && parsedAmount > 0 ? parsedAmount : 0}
              orderCurrency={PLATFORM_CURRENCY}
              enabledMethodIds={enabledMethods}
              loading={submitting}
              onPay={() => void handleCardOrCryptoPay()}
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
                      {d.methodLabel || walletDepositMethodLabel(d.method)} ·{" "}
                      {new Date(d.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <WalletPill tone={statusTone(d.status)}>{d.status}</WalletPill>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4">
            <WalletButton variant="outline" size="sm" onClick={() => retry()}>
              Refresh
            </WalletButton>
          </div>
        </WalletCard>
      </div>
    </div>
  );
}
