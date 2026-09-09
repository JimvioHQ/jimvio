"use client";

import React, { useId, useState } from "react";
import { Download, Loader2, Lock, Package, ShieldCheck } from "lucide-react";

export type ProductTypeBucket = "digital" | "physical";

export type BusinessVerificationUi = {
  verified: boolean;
  key: "not_started" | "in_progress" | "in_review" | "verified" | "failed" | "expired";
  label: string;
};

type Props = {
  value: ProductTypeBucket;
  onChange: (next: ProductTypeBucket) => void;
  business: BusinessVerificationUi;
  onVerifyBusiness: () => Promise<void> | void;
  onContinueDigital: () => void;
  disabled?: boolean;
};

/**
 * Compact product-type radio group.
 * Verification copy appears only when Physical is selected and business is not verified.
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
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const physicalLocked = !business.verified;
  const showGate = value === "physical" && physicalLocked;

  async function startVerify() {
    setVerifyError(null);
    setVerifying(true);
    try {
      await onVerifyBusiness();
    } catch (err) {
      setVerifyError(
        err instanceof Error
          ? err.message
          : "Could not start business verification. Please try again.",
      );
    } finally {
      setVerifying(false);
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
              Business verification required
            </p>
            <p className="text-[12.5px] leading-snug" style={{ color: "var(--color-text-secondary)" }}>
              {business.key === "in_progress" || business.key === "in_review"
                ? "Your business verification is in progress. Physical products unlock when approved."
                : "Verify your business before creating physical products."}
            </p>
          </div>

          {verifyError ? (
            <p className="text-[12.5px]" style={{ color: "var(--color-danger)" }} role="alert">
              {verifyError}
            </p>
          ) : null}

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => void startVerify()}
              disabled={verifying}
              className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-full px-4 text-[13px] font-semibold text-white disabled:opacity-60"
              style={{ background: "var(--color-accent)" }}
            >
              {verifying ? (
                <Loader2 size={15} className="animate-spin" aria-hidden />
              ) : (
                <ShieldCheck size={15} aria-hidden />
              )}
              {business.key === "in_progress" || business.key === "in_review"
                ? "Continue verification"
                : "Verify business"}
            </button>
            <button
              type="button"
              onClick={onContinueDigital}
              className="inline-flex min-h-[44px] items-center justify-center rounded-full px-4 text-[13px] font-semibold"
              style={{
                border: "1px solid var(--color-border)",
                background: "var(--color-surface)",
                color: "var(--color-text-primary)",
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
