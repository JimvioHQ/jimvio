"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  BILLING_INTERVALS,
  validateAccessPricing,
  type AccessPricingForm,
  type BillingInterval,
  type BillingType,
} from "@/lib/community/access-pricing";

function Segmented<T extends string | boolean>({
  value,
  options,
  onChange,
  disabled,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-1">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          disabled={disabled}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-lg px-4 py-1.5 text-[13px] font-semibold transition-colors disabled:opacity-60",
            value === o.value
              ? "bg-[#FF5A1F] text-white shadow-sm"
              : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function MoneyInput({
  value,
  onChange,
  disabled,
  label,
  invalid,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  disabled?: boolean;
  label: string;
  invalid?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex h-11 max-w-[260px] items-center rounded-xl border bg-[var(--color-surface)] px-3 focus-within:ring-2 focus-within:ring-[#FF5A1F]/30",
        invalid ? "border-red-400" : "border-[var(--color-border)]",
      )}
    >
      <span className="text-sm text-[var(--color-text-muted)]">$</span>
      <input
        type="number"
        inputMode="decimal"
        min={0}
        step="0.01"
        aria-label={label}
        disabled={disabled}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        placeholder="0.00"
        className="h-full w-full bg-transparent px-2 text-sm outline-none"
      />
      <span className="text-xs font-semibold text-[var(--color-text-muted)]">USD</span>
    </div>
  );
}

const PER: Record<BillingInterval, string> = { weekly: "week", monthly: "month", quarterly: "3 months", yearly: "year" };

/** Community Access: who can join and what it costs. */
export function AccessPricingCard({
  initial,
  readOnly,
  saving,
  onSave,
}: {
  initial: AccessPricingForm;
  readOnly: boolean;
  saving: boolean;
  onSave: (form: AccessPricingForm) => Promise<unknown>;
}) {
  const [form, setForm] = useState<AccessPricingForm>(initial);
  useEffect(() => setForm(initial), [initial]);
  const set = <K extends keyof AccessPricingForm>(k: K, v: AccessPricingForm[K]) => setForm((f) => ({ ...f, [k]: v }));
  const error = validateAccessPricing(form);
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);

  const summary = !form.paid
    ? "Anyone can join for free."
    : form.price
      ? form.billingType === "one_time"
        ? `Members pay $${form.price.toFixed(2)} once.`
        : `Members pay $${form.price.toFixed(2)} every ${PER[form.interval]}.`
      : "Set a price to start selling access.";

  return (
    <section className="space-y-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5">
      <header>
        <h2 className="text-base font-bold text-[var(--color-text-primary)]">Pricing</h2>
        <p className="mt-0.5 text-[13px] text-[var(--color-text-muted)]">{summary}</p>
      </header>

      <div className="space-y-2">
        <p className="text-[12px] font-semibold text-[var(--color-text-primary)]">Access</p>
        <Segmented
          label="Free or paid"
          value={form.paid}
          disabled={readOnly}
          onChange={(v) => set("paid", v)}
          options={[
            { value: false, label: "Free" },
            { value: true, label: "Paid" },
          ]}
        />
      </div>

      {form.paid ? (
        <>
          <div className="space-y-2">
            <p className="text-[12px] font-semibold text-[var(--color-text-primary)]">Price</p>
            <MoneyInput label="Price in USD" value={form.price} onChange={(v) => set("price", v)} disabled={readOnly} invalid={error?.field === "price"} />
          </div>

          <div className="space-y-2">
            <p className="text-[12px] font-semibold text-[var(--color-text-primary)]">Billing</p>
            <Segmented<BillingType>
              label="Billing"
              value={form.billingType}
              disabled={readOnly}
              onChange={(v) => set("billingType", v)}
              options={[
                { value: "one_time", label: "One-time" },
                { value: "subscription", label: "Subscription" },
              ]}
            />
            {form.billingType === "subscription" ? (
              <div className="pt-1">
                <Segmented<BillingInterval>
                  label="Billing interval"
                  value={form.interval}
                  disabled={readOnly}
                  onChange={(v) => set("interval", v)}
                  options={BILLING_INTERVALS.map((i) => ({ value: i.id, label: i.label }))}
                />
              </div>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <p className="text-[12px] font-semibold text-[var(--color-text-primary)]">Compare-at price</p>
              <MoneyInput
                label="Compare-at price in USD"
                value={form.compareAtPrice}
                onChange={(v) => set("compareAtPrice", v)}
                disabled={readOnly}
                invalid={error?.field === "compareAtPrice"}
              />
              <p className="text-[11px] text-[var(--color-text-muted)]">Optional. Shown crossed out next to the price.</p>
            </div>
            <div className="space-y-2">
              <p className="text-[12px] font-semibold text-[var(--color-text-primary)]">Affiliate commission</p>
              <div
                className={cn(
                  "flex h-11 max-w-[160px] items-center rounded-xl border bg-[var(--color-surface)] px-3",
                  error?.field === "affiliateCommission" ? "border-red-400" : "border-[var(--color-border)]",
                )}
              >
                <input
                  type="number"
                  min={0}
                  max={90}
                  step="1"
                  aria-label="Affiliate commission percent"
                  disabled={readOnly}
                  value={form.affiliateCommission ?? ""}
                  onChange={(e) => set("affiliateCommission", e.target.value === "" ? null : Number(e.target.value))}
                  placeholder="0"
                  className="h-full w-full bg-transparent text-sm outline-none"
                />
                <span className="text-xs font-semibold text-[var(--color-text-muted)]">%</span>
              </div>
              <p className="text-[11px] text-[var(--color-text-muted)]">Optional. Share of a referred member&apos;s payment credited to the affiliate who brought them.</p>
            </div>
          </div>
        </>
      ) : null}

      {error && form.paid ? (
        <p className="text-[12px] font-medium text-red-600" role="alert">{error.message}</p>
      ) : null}

      {!readOnly ? (
        <Button
          type="button"
          disabled={saving || !dirty || Boolean(error)}
          onClick={() => void onSave(form)}
          className="bg-[#FF5A1F] hover:bg-[#F04E14]"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Save pricing
        </Button>
      ) : null}
    </section>
  );
}
