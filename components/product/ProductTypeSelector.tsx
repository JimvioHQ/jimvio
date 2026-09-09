"use client";

import React, { useEffect, useId, useState } from "react";
import { Download, Loader2, Lock, Package, ShieldCheck, Smartphone, Wallet } from "lucide-react";

export type ProductTypeBucket = "digital" | "physical";

export type VerificationFeePayMethod =
  | "wallet"
  | "flutterwave"
  | "mobile_money"
  | "nowpayments"
  | "binancepay";

export type BusinessVerificationUi = {
  verified: boolean;
  key: "not_started" | "in_progress" | "in_review" | "verified" | "failed" | "expired";
  label: string;
  feePaid?: boolean;
  feeUsd?: number;
  feeLabel?: string;
  availableBalance?: number;
  supportedMethods?: VerificationFeePayMethod[];
  phase?:
    | "verified"
    | "fee_required"
    | "fee_paid"
    | "in_progress"
    | "in_review"
    | "failed"
    | "payment_pending";
};

type Props = {
  value: ProductTypeBucket;
  onChange: (next: ProductTypeBucket) => void;
  business: BusinessVerificationUi;
  onVerifyBusiness: () => Promise<void> | void;
  onPayVerificationFee: (method: VerificationFeePayMethod) => Promise<void> | void;
  onContinueDigital: () => void;
  disabled?: boolean;
};

const METHOD_META: Record<
  VerificationFeePayMethod,
  { label: string; hint: string; logo?: string }
> = {
  wallet: { label: "Jimvio Wallet", hint: "Pay instantly from your balance" },
  flutterwave: {
    label: "Card",
    hint: "Visa, Mastercard, Apple Pay & Google Pay via Flutterwave",
    logo: "/logos/Flutterwave-main.svg",
  },
  mobile_money: {
    label: "Mobile Money",
    hint: "Rwanda MoMo via Flutterwave (charged in RWF equivalent of $5.65)",
    logo: "/logos/Flutterwave-main.svg",
  },
  nowpayments: {
    label: "Cryptocurrency",
    hint: "Pay with crypto via NOWPayments",
    logo: "/logos/NOWPayments_idKVr3HnXR_1.svg",
  },
  binancepay: {
    label: "Binance Pay",
    hint: "Pay with Binance Pay (USDT)",
    logo: "/logos/binance.png",
  },
};

/**
 * Compact product-type radio group.
 * Verification + $5.65 fee UI appears only when Physical is selected and locked.
 */
export function ProductTypeSelector({
  value,
  onChange,
  business,
  onVerifyBusiness,
  onPayVerificationFee,
  onContinueDigital,
  disabled = false,
}: Props) {
  const groupId = useId();
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<VerificationFeePayMethod | null>(null);
  const physicalLocked = !business.verified;
  const showGate = value === "physical" && physicalLocked;
  const feeLabel = business.feeLabel || `$${(business.feeUsd ?? 5.65).toFixed(2)} USD`;
  const feePaid = Boolean(business.feePaid);
  const phase = business.phase || (feePaid ? "fee_paid" : "fee_required");
  const methods = (business.supportedMethods?.length
    ? business.supportedMethods
    : (["wallet", "flutterwave"] as VerificationFeePayMethod[])
  ).filter((m) => METHOD_META[m]);

  useEffect(() => {
    if (!selectedMethod && methods.length) {
      setSelectedMethod(methods.includes("wallet") ? "wallet" : methods[0]);
    }
  }, [methods, selectedMethod]);

  async function run(kind: string, fn: () => Promise<void> | void) {
    setActionError(null);
    setBusy(kind);
    try {
      await fn();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Something went wrong. Please try again.",
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="space-y-3" aria-labelledby={`${groupId}-heading`}>
      <h2
        id={`${groupId}-heading`}
        className="text-[13px] font-semibold"
        style={{ color: "var(--color-text-primary)" }}
      >
        Product type
      </h2>

      <div
        role="radiogroup"
        aria-labelledby={`${groupId}-heading`}
        className="grid grid-cols-2 gap-2.5"
      >
        <TypeOption
          id={`${groupId}-digital`}
          selected={value === "digital"}
          disabled={disabled}
          label="Digital"
          Icon={Download}
          onSelect={() => onChange("digital")}
        />
        <TypeOption
          id={`${groupId}-physical`}
          selected={value === "physical"}
          disabled={disabled}
          label="Physical"
          Icon={Package}
          locked={physicalLocked}
          onSelect={() => onChange("physical")}
        />
      </div>

      {showGate ? (
        <div
          role="region"
          aria-live="polite"
          className="rounded-xl px-4 py-3.5 space-y-3"
          style={{
            border: "1px solid color-mix(in srgb, var(--color-accent) 25%, var(--color-border))",
            background: "color-mix(in srgb, var(--color-accent) 6%, var(--color-surface))",
          }}
        >
          <div className="space-y-1">
            <p className="text-[14px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
              Business verification
            </p>
            <p className="text-[12.5px] leading-snug" style={{ color: "var(--color-text-secondary)" }}>
              {phase === "in_progress" || phase === "in_review"
                ? "Business verification is in progress. Physical products unlock when approved."
                : phase === "failed"
                  ? "Business verification wasn’t approved. Pay the fee again to start a new attempt."
                  : feePaid
                    ? "Payment confirmed. Start verification to unlock physical products."
                    : "Verify your business to unlock physical product selling."}
            </p>
          </div>

          {!feePaid && phase !== "in_progress" && phase !== "in_review" ? (
            <>
              <div
                className="rounded-lg px-3 py-2.5"
                style={{
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <p
                  className="text-[11px] font-medium uppercase tracking-wide"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  Verification fee
                </p>
                <p
                  className="text-[18px] font-bold tabular-nums"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {feeLabel}
                </p>
                <p className="text-[12px]" style={{ color: "var(--color-text-muted)" }}>
                  One-time fee per verification attempt
                </p>
              </div>

              <div className="space-y-2">
                <p
                  className="text-[12px] font-semibold"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  Choose payment method
                </p>
                <div className="grid gap-2">
                  {methods.map((m) => {
                    const meta = METHOD_META[m];
                    const selected = selectedMethod === m;
                    const walletLow =
                      m === "wallet" &&
                      typeof business.availableBalance === "number" &&
                      business.availableBalance < (business.feeUsd ?? 5.65);
                    return (
                      <button
                        key={m}
                        type="button"
                        disabled={busy !== null || walletLow}
                        onClick={() => setSelectedMethod(m)}
                        className="flex min-h-[48px] items-center gap-3 rounded-xl px-3 py-2.5 text-left disabled:opacity-50"
                        style={{
                          border: selected
                            ? "1.5px solid var(--color-accent)"
                            : "1px solid var(--color-border)",
                          background: selected
                            ? "color-mix(in srgb, var(--color-accent) 8%, var(--color-surface))"
                            : "var(--color-surface)",
                        }}
                      >
                        <span
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                          style={{ background: "var(--color-surface-secondary)" }}
                        >
                          {meta.logo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={meta.logo} alt="" className="h-5 w-5 object-contain" />
                          ) : m === "wallet" ? (
                            <Wallet size={16} />
                          ) : m === "mobile_money" ? (
                            <Smartphone size={16} />
                          ) : (
                            <ShieldCheck size={16} />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span
                            className="block text-[13px] font-semibold"
                            style={{ color: "var(--color-text-primary)" }}
                          >
                            {meta.label}
                          </span>
                          <span
                            className="block text-[11px] leading-snug"
                            style={{ color: "var(--color-text-muted)" }}
                          >
                            {walletLow
                              ? `Insufficient balance ($${Number(business.availableBalance).toFixed(2)})`
                              : meta.hint}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          ) : null}

          {actionError ? (
            <p className="text-[12.5px]" style={{ color: "var(--color-danger)" }} role="alert">
              {actionError}
            </p>
          ) : null}

          <div className="flex flex-col gap-2">
            {!feePaid && phase !== "in_progress" && phase !== "in_review" ? (
              <button
                type="button"
                onClick={() => {
                  if (!selectedMethod) {
                    setActionError("Choose a payment method.");
                    return;
                  }
                  void run("pay", () => onPayVerificationFee(selectedMethod));
                }}
                disabled={busy !== null || !selectedMethod}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full px-4 text-[13px] font-semibold text-white disabled:opacity-60"
                style={{ background: "var(--color-accent)" }}
              >
                {busy === "pay" ? (
                  <Loader2 size={15} className="animate-spin" aria-hidden />
                ) : (
                  <ShieldCheck size={15} aria-hidden />
                )}
                Continue to payment
              </button>
            ) : feePaid && phase !== "in_progress" && phase !== "in_review" ? (
              <button
                type="button"
                onClick={() => void run("verify", () => onVerifyBusiness())}
                disabled={busy !== null}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full px-4 text-[13px] font-semibold text-white disabled:opacity-60"
                style={{ background: "var(--color-accent)" }}
              >
                {busy === "verify" ? (
                  <Loader2 size={15} className="animate-spin" aria-hidden />
                ) : (
                  <ShieldCheck size={15} aria-hidden />
                )}
                Start verification
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void run("verify", () => onVerifyBusiness())}
                disabled={busy !== null}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full px-4 text-[13px] font-semibold disabled:opacity-60"
                style={{
                  border: "1px solid var(--color-border)",
                  background: "var(--color-surface)",
                  color: "var(--color-text-primary)",
                }}
              >
                {busy === "verify" ? (
                  <Loader2 size={15} className="animate-spin" aria-hidden />
                ) : (
                  <ShieldCheck size={15} aria-hidden />
                )}
                Continue verification
              </button>
            )}

            <button
              type="button"
              onClick={onContinueDigital}
              className="inline-flex min-h-[44px] items-center justify-center rounded-full px-4 text-[13px] font-semibold"
              style={{
                border: "1px solid transparent",
                color: "var(--color-text-muted)",
              }}
            >
              Continue with Digital
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function TypeOption({
  id,
  selected,
  disabled,
  label,
  Icon,
  locked = false,
  onSelect,
}: {
  id: string;
  selected: boolean;
  disabled: boolean;
  label: string;
  Icon: React.ComponentType<{ size?: number; "aria-hidden"?: boolean }>;
  locked?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      id={id}
      type="button"
      role="radio"
      aria-checked={selected}
      aria-disabled={disabled}
      aria-label={locked ? `${label} (business verification required)` : label}
      disabled={disabled}
      onClick={onSelect}
      className="flex min-h-[52px] items-center gap-2.5 px-3.5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      style={{
        borderRadius: "var(--radius-md, 10px)",
        border: selected
          ? "1.5px solid var(--color-accent)"
          : "1px solid var(--color-border)",
        background: selected
          ? "color-mix(in srgb, var(--color-accent) 8%, var(--color-surface))"
          : "var(--color-surface)",
        boxShadow: selected
          ? "0 0 0 3px color-mix(in srgb, var(--color-accent) 12%, transparent)"
          : "none",
      }}
    >
      <span
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center"
        style={{
          borderRadius: "var(--radius-sm, 6px)",
          background: selected ? "var(--color-accent)" : "var(--color-surface-secondary)",
          color: selected ? "#fff" : "var(--color-text-secondary)",
        }}
        aria-hidden
      >
        <Icon size={16} />
      </span>
      <span
        className="flex-1 text-[14px] font-semibold"
        style={{ color: selected ? "var(--color-accent)" : "var(--color-text-primary)" }}
      >
        {label}
      </span>
      {locked ? (
        <Lock
          size={14}
          aria-hidden
          style={{ color: selected ? "var(--color-accent)" : "var(--color-text-muted)" }}
        />
      ) : null}
    </button>
  );
}
