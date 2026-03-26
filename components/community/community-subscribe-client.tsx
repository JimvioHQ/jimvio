"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatDisplayMoney } from "@/lib/utils";
import { estimatePawaPayLocalAmount } from "@/lib/pawapay-convert";
import { getPawaPayProviderOptions } from "@/lib/pawapay-providers";

type PlanKey = "monthly" | "yearly" | "lifetime";

type CommunitySub = {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  avatar_url: string | null;
  is_free: boolean | null;
  monthly_price: number | string | null;
  yearly_price: number | string | null;
  lifetime_price: number | string | null;
  currency: string | null;
};

function normalizePlan(p: string): PlanKey {
  if (p === "yearly" || p === "lifetime" || p === "monthly") return p;
  return "monthly";
}

export function CommunitySubscribeClient({
  community,
  initialPlan,
  initialProvider,
  profilePhone,
}: {
  community: CommunitySub;
  initialPlan: string;
  initialProvider: string;
  profilePhone: string | null;
}) {
  const router = useRouter();
  const [plan, setPlan] = useState<PlanKey>(normalizePlan(initialPlan));
  const [paymentProvider, setPaymentProvider] = useState<"pesapal" | "nowpayments" | "pawapay">(
    initialProvider === "nowpayments" ? "nowpayments" : initialProvider === "pawapay" ? "pawapay" : "pesapal"
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const monthly = Number(community.monthly_price ?? 0);
  const yearly = Number(community.yearly_price ?? 0);
  const lifetime = Number(community.lifetime_price ?? 0);
  const currency = (community.currency || "USD").toUpperCase();

  const pawapayOpts = useMemo(() => {
    const all = getPawaPayProviderOptions();
    if (currency === "USD") return all;
    return all.filter((p) => p.currency.toUpperCase() === currency);
  }, [currency]);
  const [pawapayProvider, setPawapayProvider] = useState("");
  const [pawapayPhone, setPawapayPhone] = useState(profilePhone || "");

  useEffect(() => {
    if (pawapayOpts.length && !pawapayOpts.some((o) => o.id === pawapayProvider)) {
      setPawapayProvider(pawapayOpts[0].id);
    }
  }, [pawapayOpts, pawapayProvider]);

  const amount = useMemo(() => {
    if (plan === "monthly") return monthly;
    if (plan === "yearly") return yearly;
    return lifetime;
  }, [plan, monthly, yearly, lifetime]);

  const selectedPawaCurrency = pawapayOpts.find((p) => p.id === pawapayProvider)?.currency;
  const pawapayEstimate = useMemo(() => {
    if (!selectedPawaCurrency || amount <= 0) return null;
    return estimatePawaPayLocalAmount(amount, currency, selectedPawaCurrency);
  }, [amount, currency, selectedPawaCurrency]);

  const billedLabel =
    plan === "monthly" ? "Monthly" : plan === "yearly" ? "Billed annually" : "One-time payment";

  const loginNext = `/login?next=${encodeURIComponent(`/communities/${community.slug}/subscribe?plan=${plan}&provider=${paymentProvider}`)}`;

  async function pay() {
    setError(null);
    if (paymentProvider === "pawapay") {
      if (!pawapayPhone.trim() || !pawapayProvider) {
        setError("Enter your mobile number and choose a network for PawaPay");
        return;
      }
      if (pawapayOpts.length === 0) {
        setError(`No PawaPay providers for ${currency}. Configure NEXT_PUBLIC_PAWAPAY_PROVIDERS or use another method.`);
        return;
      }
    }
    const res = await fetch(`/api/communities/${community.slug}/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        planType: plan,
        paymentProvider:
          paymentProvider === "nowpayments" ? "nowpayments" : paymentProvider === "pawapay" ? "pawapay" : "pesapal",
        ...(paymentProvider === "pawapay"
          ? { pawapayProvider, pawapayPhone: pawapayPhone.trim() }
          : {}),
      }),
    });
    const data = (await res.json()) as {
      error?: string;
      redirectUrl?: string;
      invoiceUrl?: string;
      pendingUrl?: string;
      status?: string;
    };
    if (!res.ok) {
      if (res.status === 401) {
        router.push(loginNext);
        return;
      }
      setError(data.error || "Could not start checkout");
      return;
    }
    if (paymentProvider === "pawapay" && data.pendingUrl) {
      window.location.href = data.pendingUrl;
      return;
    }
    const url = data.redirectUrl || data.invoiceUrl;
    if (url) window.location.href = url;
    else setError("No redirect URL returned");
  }

  async function handlePay() {
    setSubmitting(true);
    try {
      await pay();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] px-4 py-10 sm:py-14">
      <div className="max-w-[600px] mx-auto">
        <nav className="text-xs sm:text-sm text-[var(--color-text-muted)] mb-8 flex flex-wrap items-center gap-1 font-semibold">
          <Link href="/communities" className="hover:text-[var(--color-accent)] transition-colors">
            Communities
          </Link>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60" />
          <Link
            href={`/communities/${community.slug}`}
            className="hover:text-[var(--color-accent)] transition-colors truncate max-w-[40vw] sm:max-w-none"
          >
            {community.name}
          </Link>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60" />
          <span className="text-[var(--color-text-secondary)]">Subscribe</span>
        </nav>

        <div className="flex items-start gap-4 mb-8">
          <div className="h-14 w-14 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] overflow-hidden shrink-0">
            {community.avatar_url ? (
              <Image
                src={community.avatar_url}
                alt=""
                width={56}
                height={56}
                className="object-cover h-full w-full"
                unoptimized
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-lg font-black text-[var(--color-accent)]">
                {community.name?.[0] ?? "?"}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-black text-[var(--color-text-primary)] leading-tight">{community.name}</h1>
            <p className="text-sm text-[var(--color-text-muted)] mt-1 line-clamp-2">{community.tagline || " "}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6 shadow-sm">
          <h2 className="text-sm font-black uppercase tracking-wider text-[var(--color-text-muted)] mb-4">
            Plan
          </h2>
          <div className="flex rounded-xl border border-[var(--color-border)] p-0.5 bg-[var(--color-surface-secondary)] mb-6">
            {(
              [
                ["monthly", "Monthly"] as const,
                ["yearly", "Yearly"] as const,
                ["lifetime", "Lifetime"] as const,
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setPlan(key)}
                className={cn(
                  "flex-1 py-2 text-xs font-black rounded-lg transition-colors",
                  plan === key
                    ? "bg-[var(--color-surface)] text-[var(--color-text-primary)] shadow-sm"
                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-baseline justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Selected plan</p>
              <p className="text-lg font-black text-[var(--color-text-primary)] mt-1 capitalize">{plan}</p>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-[var(--color-text-primary)] tabular-nums">
              {formatDisplayMoney(amount, currency)}
            </p>
          </div>

          <p className="text-xs font-semibold text-[var(--color-text-muted)] mt-2">{billedLabel}</p>

          <ul className="mt-6 space-y-2 text-sm text-[var(--color-text-secondary)]">
            {[
              "Access to all spaces",
              "Chat with members",
              "Courses and learning",
              "Daily tasks and challenges",
            ].map((line) => (
              <li key={line} className="flex gap-2">
                <Check className="h-4 w-4 shrink-0 text-[var(--color-success)] mt-0.5" />
                <span>{line}</span>
              </li>
            ))}
          </ul>

          <h3 className="text-sm font-black uppercase tracking-wider text-[var(--color-text-muted)] mt-8 mb-3">
            Payment method
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setPaymentProvider("pesapal")}
              className={cn(
                "rounded-2xl border p-4 text-left transition-colors",
                paymentProvider === "pesapal"
                  ? "border-[var(--color-accent)] bg-[var(--color-accent-light)]"
                  : "border-[var(--color-border)] bg-[var(--color-surface-secondary)] hover:border-[var(--color-border-strong)]"
              )}
            >
              <p className="font-black text-[var(--color-text-primary)]">PesaPal</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1 font-medium">
                MTN Mobile Money, Airtel, Card
              </p>
            </button>
            <button
              type="button"
              onClick={() => setPaymentProvider("nowpayments")}
              className={cn(
                "rounded-2xl border p-4 text-left transition-colors",
                paymentProvider === "nowpayments"
                  ? "border-[var(--color-accent)] bg-[var(--color-accent-light)]"
                  : "border-[var(--color-border)] bg-[var(--color-surface-secondary)] hover:border-[var(--color-border-strong)]"
              )}
            >
              <p className="font-black text-[var(--color-text-primary)]">NowPayments</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1 font-medium">Crypto: USDT, BTC, ETH</p>
            </button>
            <button
              type="button"
              onClick={() => setPaymentProvider("pawapay")}
              className={cn(
                "rounded-2xl border p-4 text-left transition-colors",
                paymentProvider === "pawapay"
                  ? "border-[var(--color-accent)] bg-[var(--color-accent-light)]"
                  : "border-[var(--color-border)] bg-[var(--color-surface-secondary)] hover:border-[var(--color-border-strong)]"
              )}
            >
              <p className="font-black text-[var(--color-text-primary)]">PawaPay</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1 font-medium">Mobile money API</p>
            </button>
          </div>

          {paymentProvider === "pawapay" && (
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-4 space-y-3">
              {pawapayOpts.length === 0 ? (
                <p className="text-sm text-[var(--color-text-secondary)]">
                  <span className="font-bold text-[var(--color-danger)]">No PawaPay providers for {currency}.</span> Add{" "}
                  <code className="text-xs">NEXT_PUBLIC_PAWAPAY_PROVIDERS</code> or use PesaPal / crypto. USD pricing can
                  use all networks with conversion (<code className="text-xs">RWF_TO_USD_RATE</code>,{" "}
                  <code className="text-xs">PAWAPAY_ZMW_PER_USD</code>).
                </p>
              ) : (
                <>
                  {currency === "USD" && (
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      USD subscription: wallet is charged in local currency (RWF/ZMW) using your env conversion rates.
                    </p>
                  )}
                  <div>
                    <label className="text-xs font-bold uppercase text-[var(--color-text-muted)]">Network</label>
                    <select
                      value={pawapayProvider}
                      onChange={(e) => setPawapayProvider(e.target.value)}
                      className="mt-1 w-full h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
                    >
                      {pawapayOpts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {pawapayEstimate && (
                    <p className="text-sm font-bold text-[var(--color-text-primary)]">
                      {pawapayEstimate.converted ? (
                        <>
                          Approx. charge:{" "}
                          <span className="text-[var(--color-accent)]">
                            {pawapayEstimate.localAmount.toLocaleString()} {pawapayEstimate.localCurrency}
                          </span>{" "}
                          <span className="font-normal text-[var(--color-text-muted)]">
                            (from {amount.toFixed(2)} {currency})
                          </span>
                        </>
                      ) : (
                        <>
                          Amount:{" "}
                          <span className="text-[var(--color-accent)]">
                            {pawapayEstimate.localAmount.toLocaleString()} {pawapayEstimate.localCurrency}
                          </span>
                        </>
                      )}
                    </p>
                  )}
                  {pawapayEstimate === null && selectedPawaCurrency && currency !== selectedPawaCurrency && (
                    <p className="text-xs text-[var(--color-danger)]">
                      No conversion from {currency} to {selectedPawaCurrency}.
                    </p>
                  )}
                  <div>
                    <label className="text-xs font-bold uppercase text-[var(--color-text-muted)]">Phone</label>
                    <input
                      type="tel"
                      value={pawapayPhone}
                      onChange={(e) => setPawapayPhone(e.target.value)}
                      placeholder="Country code + number"
                      className="mt-1 w-full h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {error && (
            <p className="mt-4 text-sm font-semibold text-[var(--color-danger)]" role="alert">
              {error}
            </p>
          )}

          <Button
            type="button"
            disabled={submitting || amount <= 0}
            onClick={handlePay}
            className="w-full mt-8 rounded-xl gradient-brand text-white font-black h-12 shadow-md hover:opacity-95"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Redirecting…
              </>
            ) : (
              `Pay ${formatDisplayMoney(amount, currency)}`
            )}
          </Button>

          <p className="text-center mt-5">
            <Link
              href={`/communities/${community.slug}`}
              className="text-sm font-bold text-[var(--color-text-muted)] hover:text-[var(--color-accent)]"
            >
              Cancel
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
