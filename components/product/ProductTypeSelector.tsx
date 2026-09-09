"use client";

import React, { useId, useState } from "react";
import {
  Check,
  Download,
  Loader2,
  Package,
  ShieldCheck,
  Truck,
} from "lucide-react";

export type ProductTypeBucket = "digital" | "physical";

export type BusinessVerificationUi = {
  verified: boolean;
  /** Customer-facing status key */
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

const DIGITAL_POINTS = [
  "Instant delivery after purchase",
  "Files, courses, templates & access",
  "No shipping or inventory required",
];

const PHYSICAL_POINTS = [
  "Ships to your customers",
  "Inventory, SKU & fulfillment",
  "Business verification required",
];

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
        err instanceof Error ? err.message : "Could not start business verification. Please try again.",
      );
    } finally {
      setVerifying(false);
    }
  }

  return (
    <section className="space-y-3" aria-labelledby={`${groupId}-heading`}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2
            id={`${groupId}-heading`}
            className="text-[13px] font-semibold tracking-wide uppercase"
            style={{ color: "var(--color-text-muted)", letterSpacing: "0.04em" }}
          >
            Product type
          </h2>
          <p className="mt-1 text-[13px] leading-snug" style={{ color: "var(--color-text-secondary)" }}>
            Choose how buyers receive this product. You can change this later only when allowed.
          </p>
        </div>
        {business.verified ? (
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
            style={{
              background: "var(--color-success-light, #ecfdf5)",
              border: "1px solid var(--color-success, #10b981)",
              color: "var(--color-success, #059669)",
            }}
          >
            <ShieldCheck size={12} aria-hidden />
            Business verified
          </span>
        ) : (
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium"
            style={{
              background: "var(--color-surface-secondary)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text-muted)",
            }}
          >
            {business.label}
          </span>
        )}
      </div>

      <div
        role="radiogroup"
        aria-labelledby={`${groupId}-heading`}
        className="grid grid-cols-1 sm:grid-cols-2 gap-3"
      >
        <TypeCard
          id={`${groupId}-digital`}
          selected={value === "digital"}
          disabled={disabled}
          title="Digital"
          subtitle="Instant delivery / access"
          Icon={Download}
          points={DIGITAL_POINTS}
          onSelect={() => onChange("digital")}
        />
        <TypeCard
          id={`${groupId}-physical`}
          selected={value === "physical"}
          disabled={disabled}
          title="Physical"
          subtitle="Ships to customer"
          Icon={Package}
          points={PHYSICAL_POINTS}
          badge={
            physicalLocked
              ? { label: "Verification required", tone: "warn" }
              : { label: "Unlocked", tone: "ok" }
          }
          onSelect={() => onChange("physical")}
          restricted={physicalLocked && value !== "physical"}
        />
      </div>

      {showGate && (
        <div
          role="region"
          aria-live="polite"
          className="rounded-2xl p-4 sm:p-5 space-y-3.5"
          style={{
            border: "1px solid color-mix(in srgb, var(--color-accent) 28%, var(--color-border))",
            background:
              "linear-gradient(180deg, color-mix(in srgb, var(--color-accent) 8%, var(--color-surface)) 0%, var(--color-surface) 100%)",
          }}
        >
          <div className="flex gap-3">
            <div
              className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
              style={{
                background: "var(--color-accent)",
                color: "#fff",
              }}
              aria-hidden
            >
              <Truck size={18} />
            </div>
            <div className="min-w-0 space-y-1.5">
              <p className="text-[15px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
                Physical products require business verification
              </p>
              <p className="text-[13px] leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                To list products that are shipped to customers, your business must be verified first.
                Once approved, you can create and publish physical products on Jimvio.
              </p>
              {business.key === "in_progress" || business.key === "in_review" ? (
                <p className="text-[12.5px] font-medium" style={{ color: "var(--color-accent)" }}>
                  Business verification is in progress. We will unlock Physical products when it is approved.
                </p>
              ) : null}
            </div>
          </div>

          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12.5px]" style={{ color: "var(--color-text-secondary)" }}>
            {[
              "Sell physical products",
              "Access physical publishing",
              "Build buyer trust",
              "Use eligible seller features",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <Check size={14} className="mt-0.5 flex-shrink-0" style={{ color: "var(--color-accent)" }} aria-hidden />
                <span>{item}</span>
              </li>
            ))}
          </ul>

          {verifyError ? (
            <p className="text-[12.5px]" style={{ color: "var(--color-danger)" }} role="alert">
              {verifyError}
            </p>
          ) : null}

          <div className="flex flex-col sm:flex-row gap-2 pt-0.5">
            <button
              type="button"
              onClick={() => void startVerify()}
              disabled={verifying}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full px-5 text-[13px] font-semibold text-white transition-opacity disabled:opacity-60"
              style={{ background: "var(--color-accent)" }}
            >
              {verifying ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <ShieldCheck size={15} aria-hidden />}
              {business.key === "in_progress" || business.key === "in_review"
                ? "Continue verification"
                : "Verify business"}
            </button>
            <button
              type="button"
              onClick={onContinueDigital}
              className="inline-flex min-h-[44px] items-center justify-center rounded-full px-5 text-[13px] font-semibold transition-colors"
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
      )}
    </section>
  );
}

function TypeCard({
  id,
  selected,
  disabled,
  title,
  subtitle,
  Icon,
  points,
  badge,
  onSelect,
  restricted = false,
}: {
  id: string;
  selected: boolean;
  disabled: boolean;
  title: string;
  subtitle: string;
  Icon: React.ComponentType<{ size?: number; className?: string; "aria-hidden"?: boolean }>;
  points: string[];
  badge?: { label: string; tone: "warn" | "ok" };
  onSelect: () => void;
  restricted?: boolean;
}) {
  return (
    <button
      id={id}
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      className="group relative flex w-full flex-col gap-3 p-4 sm:p-5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 min-h-[44px]"
      style={{
        borderRadius: "var(--radius-lg, 14px)",
        border: selected
          ? "1.5px solid var(--color-accent)"
          : "1px solid var(--color-border)",
        background: selected
          ? "color-mix(in srgb, var(--color-accent) 7%, var(--color-surface))"
          : "var(--color-surface)",
        boxShadow: selected
          ? "0 0 0 3px color-mix(in srgb, var(--color-accent) 14%, transparent)"
          : "var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.04))",
        opacity: restricted && !selected ? 0.92 : 1,
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center transition-colors"
          style={{
            borderRadius: "var(--radius-md, 10px)",
            background: selected ? "var(--color-accent)" : "var(--color-surface-secondary)",
            color: selected ? "#fff" : "var(--color-text-secondary)",
          }}
          aria-hidden
        >
          <Icon size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="text-[15px] font-semibold"
              style={{ color: selected ? "var(--color-accent)" : "var(--color-text-primary)" }}
            >
              {title}
            </span>
            {badge ? (
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                style={
                  badge.tone === "ok"
                    ? {
                        background: "var(--color-success-light, #ecfdf5)",
                        color: "var(--color-success, #059669)",
                      }
                    : {
                        background: "color-mix(in srgb, var(--color-accent) 12%, transparent)",
                        color: "var(--color-accent)",
                      }
                }
              >
                {badge.label}
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-[12.5px]" style={{ color: "var(--color-text-muted)" }}>
            {subtitle}
          </p>
        </div>
        <span
          className="mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full"
          style={{
            border: selected
              ? "none"
              : "1.5px solid var(--color-border-strong)",
            background: selected ? "var(--color-accent)" : "transparent",
            color: "#fff",
          }}
          aria-hidden
        >
          {selected ? <Check size={12} strokeWidth={3} /> : null}
        </span>
      </div>

      <ul className="space-y-1.5 pl-[56px] sm:pl-0">
        {points.map((point) => (
          <li
            key={point}
            className="flex items-start gap-2 text-[12px] leading-snug"
            style={{ color: "var(--color-text-secondary)" }}
          >
            <Check
              size={13}
              className="mt-0.5 flex-shrink-0"
              style={{ color: selected ? "var(--color-accent)" : "var(--color-text-muted)" }}
              aria-hidden
            />
            <span>{point}</span>
          </li>
        ))}
      </ul>
    </button>
  );
}
