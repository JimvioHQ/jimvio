"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Loader2, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

export type MoMoMarketClient = {
  countryCode: string;
  countryName: string;
  flag: string;
  currency: string;
  dialCode: string;
  requiresNetwork: boolean;
  requiresPhone?: boolean;
  authorizationMode?: "redirect" | "push" | "redirect_or_push";
  networks: Array<{ id: string; label: string }>;
};

export type MoMoFormState = {
  country: string;
  network: string;
  phone: string;
};

type Quote = {
  amount: number;
  currency: string;
  exchangeRate: number;
  amountUsd: number;
};

interface MobileMoneyCheckoutPanelProps {
  amountUsd: number;
  formatMoney: (amount: number, currency: string) => string;
  preferredCountry?: string | null;
  preferredPhone?: string | null;
  value: MoMoFormState;
  onChange: (next: MoMoFormState) => void;
  awaitingConfirmation?: boolean;
  error?: string | null;
}

function stripDial(phone: string, dialCode: string): string {
  const digits = phone.replace(/[^\d]/g, "");
  const dial = dialCode.replace(/[^\d]/g, "");
  if (digits.startsWith(dial)) return digits.slice(dial.length);
  if (digits.startsWith("0")) return digits.replace(/^0+/, "");
  return digits;
}

function authHint(mode: MoMoMarketClient["authorizationMode"]): string {
  if (mode === "push") {
    return "After you continue, approve the payment on your phone.";
  }
  if (mode === "redirect") {
    return "You may be redirected to confirm the payment securely.";
  }
  return "Authorize the charge on your phone after you continue.";
}

/** Compact provider chip — label only, no fake logos. */
function ProviderChip({
  label,
  selected,
  onSelect,
  disabled,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-lg border px-3 text-[12px] font-semibold transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/35",
        selected
          ? "border-[var(--color-accent)] bg-[var(--color-accent-light)]/50 text-[var(--color-text-primary)]"
          : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)]",
        disabled && "opacity-50 cursor-not-allowed",
      )}
    >
      {label}
    </button>
  );
}

export function MobileMoneyCheckoutPanel({
  amountUsd,
  formatMoney,
  preferredCountry,
  preferredPhone,
  value,
  onChange,
  awaitingConfirmation = false,
  error = null,
}: MobileMoneyCheckoutPanelProps) {
  const [markets, setMarkets] = useState<MoMoMarketClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [preferredUnsupported, setPreferredUnsupported] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/payments/mobile-money/capabilities")
      .then((r) => r.json())
      .then((data: { markets?: MoMoMarketClient[] }) => {
        if (cancelled) return;
        const list = Array.isArray(data.markets) ? data.markets : [];
        setMarkets(list);
        setLoading(false);

        const preferredCode = String(preferredCountry ?? "")
          .trim()
          .toUpperCase();
        const preferred =
          preferredCode.length === 2
            ? list.find((m) => m.countryCode === preferredCode)
            : undefined;

        if (preferredCode && !preferred) {
          setPreferredUnsupported(true);
        }

        // Only auto-seed when the preferred checkout country is actually supported.
        // Never silently default to Rwanda (or any other first catalog entry).
        if (!value.country && preferred) {
          const phoneLocal = preferredPhone
            ? stripDial(preferredPhone, preferred.dialCode)
            : "";
          onChange({
            country: preferred.countryCode,
            network: preferred.networks[0]?.id ?? "",
            phone: phoneLocal,
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMarkets([]);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed once from preferred profile/shipping
  }, []);

  const selectedMarket = useMemo(
    () => markets.find((m) => m.countryCode === value.country) ?? null,
    [markets, value.country],
  );

  useEffect(() => {
    if (!value.country || !(amountUsd > 0)) {
      setQuote(null);
      return;
    }
    let cancelled = false;
    const country = value.country;
    fetch(
      `/api/payments/mobile-money/capabilities?country=${encodeURIComponent(country)}&amountUsd=${encodeURIComponent(String(amountUsd))}`,
    )
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.quote) {
          setQuote({
            amount: Number(data.quote.amount),
            currency: String(data.quote.currency),
            exchangeRate: Number(data.quote.exchangeRate),
            amountUsd: Number(data.quote.amountUsd),
          });
        } else {
          setQuote(null);
        }
        setQuoteLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setQuote(null);
          setQuoteLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [value.country, amountUsd]);

  function handleCountryChange(countryCode: string) {
    const market = markets.find((m) => m.countryCode === countryCode);
    if (!market) return;
    setPreferredUnsupported(false);
    setQuoteLoading(true);
    setQuote(null);
    const phoneLocal = preferredPhone
      ? stripDial(preferredPhone, market.dialCode)
      : "";
    onChange({
      country: market.countryCode,
      network: market.networks[0]?.id ?? "",
      phone: phoneLocal,
    });
  }

  if (loading) {
    return (
      <div
        className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-4"
        role="status"
        aria-live="polite"
      >
        <div className="flex items-center gap-2 text-[13px] text-[var(--color-text-secondary)]">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading Mobile Money options…
        </div>
      </div>
    );
  }

  if (markets.length === 0) {
    return (
      <div
        className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-4 text-[13px] text-[var(--color-text-secondary)]"
        role="alert"
      >
        Mobile Money is not available right now. Please choose another payment
        method.
      </div>
    );
  }

  return (
    <div
      className="mt-4 space-y-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)]/60 p-4 max-lg:p-3.5"
      aria-label="Mobile Money payment details"
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-400/90 text-black"
          aria-hidden
        >
          <Smartphone className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-[14px] font-bold text-[var(--color-text-primary)]">
            Mobile Money
          </p>
          <p className="mt-0.5 text-[12px] text-[var(--color-text-secondary)]">
            {selectedMarket
              ? authHint(selectedMarket.authorizationMode)
              : "Select your country to see available providers"}
          </p>
        </div>
      </div>

      {preferredUnsupported && !value.country && (
        <p className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-900 dark:text-amber-100" role="status">
          Mobile Money is not currently available in this country. Choose a
          supported country for your mobile wallet, or pick another payment
          method.
        </p>
      )}

      <label className="block space-y-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
          Country
        </span>
        <select
          value={value.country}
          onChange={(e) => handleCountryChange(e.target.value)}
          disabled={awaitingConfirmation}
          className={cn(
            "h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[14px]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/35",
          )}
          aria-required
        >
          <option value="" disabled>
            Choose your country
          </option>
          {markets.map((m) => (
            <option key={m.countryCode} value={m.countryCode}>
              {m.flag} {m.countryName}
            </option>
          ))}
        </select>
      </label>

      {selectedMarket && selectedMarket.networks.length > 0 && (
        <fieldset className="space-y-2" disabled={awaitingConfirmation}>
          <legend className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
            {selectedMarket.requiresNetwork
              ? "Mobile Money Provider"
              : "Provider"}
          </legend>
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label="Mobile Money providers"
          >
            {selectedMarket.networks.map((n) => (
              <ProviderChip
                key={n.id}
                label={n.label}
                selected={
                  selectedMarket.requiresNetwork
                    ? value.network === n.id
                    : true
                }
                disabled={awaitingConfirmation || !selectedMarket.requiresNetwork}
                onSelect={() => {
                  if (!selectedMarket.requiresNetwork) return;
                  onChange({ ...value, network: n.id });
                }}
              />
            ))}
          </div>
        </fieldset>
      )}

      {selectedMarket && (
        <label className="block space-y-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
            Mobile Number
          </span>
          <div className="flex gap-2">
            <span
              className="inline-flex h-11 shrink-0 items-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[13px] font-semibold text-[var(--color-text-primary)]"
              aria-hidden
            >
              {selectedMarket.flag} {selectedMarket.dialCode}
            </span>
            <input
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="Mobile wallet number"
              value={value.phone}
              onChange={(e) =>
                onChange({
                  ...value,
                  phone: e.target.value.replace(/[^\d\s]/g, ""),
                })
              }
              disabled={awaitingConfirmation}
              className={cn(
                "h-11 min-w-0 flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[14px]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/35",
              )}
              aria-required
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "momo-error" : "momo-phone-hint"}
            />
          </div>
          <span id="momo-phone-hint" className="text-[11px] text-[var(--color-text-muted)]">
            Enter the number linked to your {selectedMarket.countryName} mobile
            wallet.
          </span>
        </label>
      )}

      {selectedMarket && (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-3 space-y-2">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[12px] text-[var(--color-text-secondary)]">
              Order total
            </span>
            <span className="text-[14px] font-bold text-[var(--color-text-primary)] tabular-nums">
              {formatMoney(amountUsd, "USD")}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[12px] text-[var(--color-text-secondary)]">
              Mobile Money amount
            </span>
            <span
              className="text-[14px] font-bold text-[var(--color-text-primary)] tabular-nums"
              aria-live="polite"
            >
              {quoteLoading
                ? "…"
                : quote
                  ? `≈ ${quote.currency} ${quote.amount.toLocaleString()}`
                  : `Charged in ${selectedMarket.currency}`}
            </span>
          </div>
        </div>
      )}

      {awaitingConfirmation && (
        <div
          className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-[13px] text-amber-900 dark:text-amber-100"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
          {selectedMarket?.authorizationMode === "push"
            ? "Check your phone and approve the payment…"
            : "Waiting for Mobile Money confirmation…"}
        </div>
      )}

      {error && (
        <p id="momo-error" className="text-[13px] text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
