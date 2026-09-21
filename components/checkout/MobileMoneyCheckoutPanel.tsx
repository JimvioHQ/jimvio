"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Loader2, Lock, Smartphone } from "lucide-react";
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

export interface MobileMoneyPaymentStepProps {
  amountUsd: number;
  formatMoney: (amount: number, currency: string) => string;
  preferredCountry?: string | null;
  preferredPhone?: string | null;
  value: MoMoFormState;
  onChange: (next: MoMoFormState) => void;
  onBack: () => void;
  onContinue: () => void;
  submitting?: boolean;
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
        "inline-flex min-h-11 min-w-[5.5rem] flex-1 items-center justify-center rounded-xl border px-4 text-[13px] font-semibold transition-colors sm:flex-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/35",
        selected
          ? "border-[var(--color-accent)] bg-[var(--color-accent-light)]/50 text-[var(--color-text-primary)] shadow-[0_4px_14px_rgba(253,80,0,0.1)]"
          : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)]",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      {label}
    </button>
  );
}

/**
 * Dedicated Mobile Money payment step — not an inline expandable panel.
 * Selecting the method only navigates here; payment starts on Continue.
 */
export function MobileMoneyPaymentStep({
  amountUsd,
  formatMoney,
  preferredCountry,
  preferredPhone,
  value,
  onChange,
  onBack,
  onContinue,
  submitting = false,
  awaitingConfirmation = false,
  error = null,
}: MobileMoneyPaymentStepProps) {
  const [markets, setMarkets] = useState<MoMoMarketClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [preferredUnsupported, setPreferredUnsupported] = useState(false);
  /** Progressive disclosure: setup → confirm before initiating payment. */
  const [phase, setPhase] = useState<"setup" | "confirm">("setup");

  const busy = submitting || awaitingConfirmation;

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
    setQuoteLoading(true);
    fetch(
      `/api/payments/mobile-money/capabilities?country=${encodeURIComponent(value.country)}&amountUsd=${encodeURIComponent(String(amountUsd))}`,
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
    setPhase("setup");
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

  const networkReady =
    !selectedMarket?.requiresNetwork || Boolean(value.network);
  const showProviders = Boolean(selectedMarket && selectedMarket.networks.length > 0);
  const showPhone = Boolean(selectedMarket && networkReady);
  const canReview =
    Boolean(value.country) &&
    Boolean(value.phone.trim()) &&
    networkReady &&
    !busy &&
    markets.length > 0;

  const networkLabel =
    selectedMarket?.networks.find((n) => n.id === value.network)?.label ??
    selectedMarket?.networks[0]?.label ??
    "Mobile Money";

  function handleBack() {
    if (phase === "confirm" && !busy) {
      setPhase("setup");
      return;
    }
    onBack();
  }

  return (
    <div
      className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:p-7 max-lg:shadow-[0_4px_20px_rgba(0,0,0,0.06)]"
      aria-label="Mobile Money payment"
    >
      <button
        type="button"
        onClick={handleBack}
        disabled={busy}
        className={cn(
          "mb-5 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--color-text-secondary)]",
          "transition-colors hover:text-[var(--color-text-primary)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/35 rounded-md",
          busy && "opacity-50 cursor-not-allowed",
        )}
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {phase === "confirm" ? "Back" : "Back to payment methods"}
      </button>

      <div className="mb-6 flex items-start gap-3.5">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
          style={{
            background: "linear-gradient(135deg, #FFCC00 0%, #F5A623 100%)",
          }}
          aria-hidden
        >
          <Smartphone className="h-5 w-5 text-black" />
        </div>
        <div className="min-w-0">
          <h1 className="text-[20px] font-bold tracking-[-0.02em] text-[var(--color-text-primary)] sm:text-[22px]">
            Mobile Money
          </h1>
          <p className="mt-1 text-[13px] leading-relaxed text-[var(--color-text-secondary)] sm:text-[14px]">
            {phase === "confirm"
              ? "Confirm your mobile wallet details before paying."
              : "Choose your country and mobile wallet"}
          </p>
          {selectedMarket && phase === "setup" ? (
            <p className="mt-1.5 text-[12px] text-[var(--color-text-muted)]">
              {authHint(selectedMarket.authorizationMode)}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mb-5 flex items-baseline justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)]/70 px-4 py-3">
        <span className="text-[12px] font-medium text-[var(--color-text-secondary)]">
          Order total
        </span>
        <span className="text-[16px] font-bold tabular-nums text-[var(--color-text-primary)]">
          {formatMoney(amountUsd, "USD")}
        </span>
      </div>

      {loading ? (
        <div
          className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] px-4 py-8 text-[13px] text-[var(--color-text-secondary)]"
          role="status"
        >
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading Mobile Money options…
        </div>
      ) : markets.length === 0 ? (
        <div
          className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-4 py-5 text-[13px] text-[var(--color-text-secondary)]"
          role="alert"
        >
          Mobile Money is not available right now. Please choose another payment
          method.
        </div>
      ) : phase === "confirm" && selectedMarket ? (
        <div className="space-y-5">
          <div className="space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4">
            <p className="text-[15px] font-bold text-[var(--color-text-primary)]">
              {networkLabel} · {selectedMarket.countryName}
            </p>
            <p className="text-[14px] tabular-nums text-[var(--color-text-secondary)]">
              {selectedMarket.dialCode} {value.phone.trim()}
            </p>
            <div className="border-t border-[var(--color-border)] pt-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[13px] text-[var(--color-text-secondary)]">
                  Amount
                </span>
                <span className="text-[16px] font-bold tabular-nums text-[var(--color-accent)]">
                  {quoteLoading
                    ? "…"
                    : quote
                      ? `${quote.currency} ${quote.amount.toLocaleString()}`
                      : selectedMarket.currency}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">
                Order total {formatMoney(amountUsd, "USD")}
                {quote ? ` · Mobile Money ≈ ${quote.currency} ${quote.amount.toLocaleString()}` : ""}
              </p>
            </div>
          </div>

          {awaitingConfirmation ? (
            <div
              className="flex items-center gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-3 text-[13px] text-amber-900 dark:text-amber-100"
              role="status"
              aria-live="polite"
            >
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
              {selectedMarket.authorizationMode === "push"
                ? "Awaiting payment confirmation — approve on your phone"
                : "Awaiting payment confirmation…"}
            </div>
          ) : null}

          {error ? (
            <p id="momo-error" className="text-[13px] text-red-600" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="button"
            onClick={onContinue}
            disabled={busy}
            className={cn(
              "flex h-12 w-full items-center justify-center gap-2 rounded-xl text-[14px] font-bold text-white",
              "bg-[var(--color-accent)] shadow-[0_4px_14px_rgba(253,80,0,0.22)]",
              "transition-[transform,background-color,opacity] duration-200",
              "hover:scale-[1.01] hover:bg-[var(--color-accent)]/90",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40 focus-visible:ring-offset-2",
              "active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100",
            )}
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                {awaitingConfirmation
                  ? "Awaiting payment confirmation…"
                  : `Connecting to ${networkLabel}…`}
              </>
            ) : (
              <>
                <Lock className="h-4 w-4" aria-hidden />
                Continue to secure payment
                <ArrowRight className="h-4 w-4" aria-hidden />
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {preferredUnsupported && !value.country && (
            <p
              className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-3.5 py-2.5 text-[12px] text-amber-900 dark:text-amber-100"
              role="status"
            >
              Mobile Money is not currently available in this country. Choose a
              supported country for your mobile wallet, or go back and pick
              another payment method.
            </p>
          )}

          <label className="block space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-tertiary)]">
              Country
            </span>
            <select
              value={value.country}
              onChange={(e) => handleCountryChange(e.target.value)}
              disabled={busy}
              className={cn(
                "h-12 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 text-[14px]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/35",
              )}
              aria-required
            >
              <option value="" disabled>
                Select country
              </option>
              {markets.map((m) => (
                <option key={m.countryCode} value={m.countryCode}>
                  {m.flag} {m.countryName}
                </option>
              ))}
            </select>
          </label>

          {showProviders ? (
            <fieldset className="space-y-2.5" disabled={busy}>
              <legend className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-tertiary)]">
                {selectedMarket!.requiresNetwork
                  ? "Mobile Money Provider"
                  : "Provider"}
              </legend>
              <div
                className="flex flex-wrap gap-2"
                role="group"
                aria-label="Mobile Money providers"
              >
                {selectedMarket!.networks.map((n) => (
                  <ProviderChip
                    key={n.id}
                    label={n.label}
                    selected={
                      selectedMarket!.requiresNetwork
                        ? value.network === n.id
                        : true
                    }
                    disabled={busy || !selectedMarket!.requiresNetwork}
                    onSelect={() => {
                      if (!selectedMarket!.requiresNetwork) return;
                      onChange({ ...value, network: n.id });
                    }}
                  />
                ))}
              </div>
            </fieldset>
          ) : null}

          {showPhone ? (
            <label className="block space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-tertiary)]">
                Mobile Number
              </span>
              <div className="flex gap-2">
                <span
                  className="inline-flex h-12 shrink-0 items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-3.5 text-[13px] font-semibold text-[var(--color-text-primary)]"
                  aria-hidden
                >
                  {selectedMarket!.flag} {selectedMarket!.dialCode}
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
                  disabled={busy}
                  className={cn(
                    "h-12 min-w-0 flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 text-[14px]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/35",
                  )}
                  aria-required
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? "momo-error" : "momo-phone-hint"}
                />
              </div>
              <span
                id="momo-phone-hint"
                className="block text-[12px] text-[var(--color-text-muted)]"
              >
                Enter the number linked to your {selectedMarket!.countryName}{" "}
                mobile wallet.
              </span>
            </label>
          ) : null}

          {selectedMarket && showPhone ? (
            <div className="space-y-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-tertiary)]">
                Payment Amount
              </p>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[13px] text-[var(--color-text-secondary)]">
                  Order total
                </span>
                <span className="text-[14px] font-bold tabular-nums text-[var(--color-text-primary)]">
                  {formatMoney(amountUsd, "USD")}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[13px] text-[var(--color-text-secondary)]">
                  Mobile Money amount
                </span>
                <span
                  className="text-[15px] font-bold tabular-nums text-[var(--color-accent)]"
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
          ) : null}

          {error ? (
            <p id="momo-error" className="text-[13px] text-red-600" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="button"
            onClick={() => setPhase("confirm")}
            disabled={!canReview}
            className={cn(
              "flex h-12 w-full items-center justify-center gap-2 rounded-xl text-[14px] font-bold text-white",
              "bg-[var(--color-accent)] shadow-[0_4px_14px_rgba(253,80,0,0.22)]",
              "transition-[transform,background-color,opacity] duration-200",
              "hover:scale-[1.01] hover:bg-[var(--color-accent)]/90",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40 focus-visible:ring-offset-2",
              "active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100",
            )}
          >
            Review & continue
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>

          <p className="text-center text-[11px] leading-relaxed text-[var(--color-text-muted)]">
            Secure payment — completed only after confirmation.
          </p>
        </div>
      )}
    </div>
  );
}

/** @deprecated Prefer MobileMoneyPaymentStep */
export const MobileMoneyCheckoutPanel = MobileMoneyPaymentStep;
