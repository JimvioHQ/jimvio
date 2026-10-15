"use client";

import React, { useId, useState } from "react";
import Link from "next/link";
import { Download, Loader2, Lock, Package, ShieldCheck } from "lucide-react";
import { physicalSellerSupportHref } from "@/lib/products/physical-selling";

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
  feeUsd?: number | null;
  feeLabel?: string | null;
  availableBalance?: number;
  supportedMethods?: VerificationFeePayMethod[];
  phase?:
    | "verified"
    | "pending"
    | "rejected"
    | "suspended"
    | "not_requested"
    | "fee_required"
    | "fee_paid"
    | "in_progress"
    | "in_review"
    | "failed"
    | "payment_pending";
  supportHref?: string;
};

type Props = {
  value: ProductTypeBucket;
  onChange: (next: ProductTypeBucket) => void;
  business: BusinessVerificationUi;
  onVerifyBusiness: () => Promise<void> | void;
  onPayVerificationFee?: (method: VerificationFeePayMethod) => Promise<void> | void;
  onContinueDigital: () => void;
  disabled?: boolean;
};

/**
 * Product type selector. Physical selling unlocks after Support review and Admin approval.
 * This component does not start a verification payment.
 */
export function ProductTypeSelector({
  value,
  onChange,
  business,
  onVerifyBusiness,
  onContinueDigital,
  disabled = false,
}: Props) {
  const groupId = useId();
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const physicalLocked = !business.verified;
  const showGate = value === "physical" && physicalLocked;
  const phase = business.phase;
  const supportHref = business.supportHref || physicalSellerSupportHref();

  const statusCopy =
    phase === "pending" || phase === "in_review" || phase === "in_progress"
      ? "Your verification request is with Support. Physical products unlock after an administrator approves your business."
      : phase === "rejected" || phase === "failed"
        ? "Your business review needs changes. Contact Support with any updated details. Approval is not a payment."
        : phase === "suspended"
          ? "Physical product selling is suspended on this account. Contact Support if you believe this is a mistake."
          : "Verify your business to unlock physical product selling.";

  return (
    <section className="space-y-3" aria-labelledby={`${groupId}-heading`}>
      <h2 id={`${groupId}-heading`} className="text-[13px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
        Product type
      </h2>

      <div role="radiogroup" aria-labelledby={`${groupId}-heading`} className="grid grid-cols-2 gap-2.5">
        <TypeOption id={`${groupId}-digital`} selected={value === "digital"} disabled={disabled} label="Digital" Icon={Download} onSelect={() => onChange("digital")} />
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
          className="space-y-3 rounded-xl px-4 py-3.5"
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
              {statusCopy}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[13px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
              Contact Support to verify your business
            </p>
            <p className="text-[12.5px] leading-snug" style={{ color: "var(--color-text-secondary)" }}>
              To sell physical products on Jimvio, contact our Support team for a business-verification review. Once your business is approved, you can upload physical products from your account.
            </p>
          </div>
          {actionError ? (
            <p className="text-[12.5px]" style={{ color: "var(--color-danger)" }} role="alert">
              {actionError}
            </p>
          ) : null}
          <div className="flex flex-col gap-2">
            <Link
              href={supportHref}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full px-4 text-[13px] font-semibold text-white"
              style={{ background: "var(--color-accent)" }}
            >
              <ShieldCheck size={15} aria-hidden />
              Contact Support
            </Link>
            <button
              type="button"
              onClick={() => {
                setActionError(null);
                setBusy(true);
                Promise.resolve(onVerifyBusiness())
                  .catch((err: unknown) => {
                    setActionError(err instanceof Error ? err.message : "Could not check verification status.");
                  })
                  .finally(() => setBusy(false));
              }}
              disabled={busy}
              className="inline-flex min-h-[44px] items-center justify-center rounded-full px-4 text-[13px] font-semibold disabled:opacity-60"
              style={{ border: "1px solid var(--color-border)", background: "var(--color-surface)", color: "var(--color-text-primary)" }}
            >
              {busy ? <Loader2 size={15} className="animate-spin" aria-hidden /> : "Check verification status"}
            </button>
            <button
              type="button"
              onClick={onContinueDigital}
              className="inline-flex min-h-[44px] items-center justify-center rounded-full px-4 text-[13px] font-semibold"
              style={{ color: "var(--color-text-muted)" }}
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
        border: selected ? "1.5px solid var(--color-accent)" : "1px solid var(--color-border)",
        background: selected ? "color-mix(in srgb, var(--color-accent) 8%, var(--color-surface))" : "var(--color-surface)",
      }}
    >
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center" style={{ borderRadius: "var(--radius-sm, 6px)", background: "var(--color-surface-secondary)" }}>
        <Icon size={16} aria-hidden />
      </span>
      <span className="text-[13px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
        {label}
      </span>
      {locked ? <Lock size={14} className="ml-auto" aria-hidden /> : null}
    </button>
  );
}
