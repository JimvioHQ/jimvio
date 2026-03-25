"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatDisplayMoney } from "@/lib/utils";

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
}: {
  community: CommunitySub;
  initialPlan: string;
  initialProvider: string;
}) {
  const router = useRouter();
  const [plan, setPlan] = useState<PlanKey>(normalizePlan(initialPlan));
  const [paymentProvider, setPaymentProvider] = useState<"pesapal" | "nowpayments">(
    initialProvider === "nowpayments" ? "nowpayments" : "pesapal"
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const monthly = Number(community.monthly_price ?? 0);
  const yearly = Number(community.yearly_price ?? 0);
  const lifetime = Number(community.lifetime_price ?? 0);
  const currency = community.currency || "USD";

  const amount = useMemo(() => {
    if (plan === "monthly") return monthly;
    if (plan === "yearly") return yearly;
    return lifetime;
  }, [plan, monthly, yearly, lifetime]);

  const billedLabel =
    plan === "monthly" ? "Monthly" : plan === "yearly" ? "Billed annually" : "One-time payment";

  const loginNext = `/login?next=${encodeURIComponent(`/communities/${community.slug}/subscribe?plan=${plan}&provider=${paymentProvider}`)}`;

  async function pay() {
    setError(null);
    const res = await fetch(`/api/communities/${community.slug}/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        planType: plan,
        paymentProvider: paymentProvider === "nowpayments" ? "nowpayments" : "pesapal",
      }),
    });
    const data = (await res.json()) as { error?: string; redirectUrl?: string; invoiceUrl?: string };
    if (!res.ok) {
      if (res.status === 401) {
        router.push(loginNext);
        return;
      }
      setError(data.error || "Could not start checkout");
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
          </div>

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
