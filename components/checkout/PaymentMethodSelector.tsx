"use client";

import { CreditCard, Bitcoin, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const COINS = [
  { id: "usdttrc20", label: "USDT (TRC20)" },
  { id: "btc", label: "Bitcoin (BTC)" },
  { id: "eth", label: "Ethereum (ETH)" },
  { id: "bnb", label: "BNB" },
];

export function PaymentMethodSelector({
  selected,
  onSelect,
  payCurrency,
  onCurrencyChange,
}: {
  selected: "pesapal" | "nowpayments" | null;
  onSelect: (method: "pesapal" | "nowpayments") => void;
  payCurrency: string;
  onCurrencyChange: (currency: string) => void;
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-[var(--color-text-primary)]">Payment method</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => onSelect("pesapal")}
          className={cn(
            "relative rounded-2xl border-2 p-4 text-left transition-all",
            selected === "pesapal"
              ? "border-[var(--color-success)] bg-[var(--color-success-light)] shadow-[0_0_0_3px_rgba(0,166,80,0.2)]"
              : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-border-strong)]"
          )}
        >
          {selected === "pesapal" && (
            <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-success)] text-white">
              <Check className="h-3.5 w-3.5" />
            </span>
          )}
          <span className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-success-light)] text-[var(--color-success)]">
            <CreditCard className="h-5 w-5" />
          </span>
          <p className="font-bold text-[var(--color-text-primary)]">Pay with PesaPal</p>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1">MTN Mobile Money · Airtel · Visa · Mastercard</p>
          <span className="mt-2 inline-block rounded-full bg-[var(--color-success)]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--color-success)]">
            Recommended for Africa
          </span>
        </button>

        <button
          type="button"
          onClick={() => onSelect("nowpayments")}
          className={cn(
            "relative rounded-2xl border-2 p-4 text-left transition-all",
            selected === "nowpayments"
              ? "border-[var(--color-bg-dark)] bg-[var(--color-surface-secondary)] shadow-[0_0_0_3px_rgba(45,34,72,0.2)]"
              : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-border-strong)]"
          )}
        >
          {selected === "nowpayments" && (
            <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-bg-dark)] text-white">
              <Check className="h-3.5 w-3.5" />
            </span>
          )}
          <span className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-accent-light)] text-[var(--color-accent)]">
            <Bitcoin className="h-5 w-5" />
          </span>
          <p className="font-bold text-[var(--color-text-primary)]">Pay with Crypto</p>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1">USDT · BTC · ETH · 300+ coins</p>
          <span className="mt-2 inline-block rounded-full bg-[var(--color-bg-dark)]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-primary)]">
            Global
          </span>
        </button>
      </div>

      {selected === "nowpayments" && (
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Choose coin</label>
          <select
            value={payCurrency}
            onChange={(e) => onCurrencyChange(e.target.value)}
            className="mt-2 w-full h-12 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-sm font-medium text-[var(--color-text-primary)]"
          >
            {COINS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
