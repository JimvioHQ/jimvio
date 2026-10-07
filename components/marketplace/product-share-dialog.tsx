"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Check, Copy, Link2, Loader2, Share2, X } from "lucide-react";
import { toast } from "sonner";
import {
  estimateAffiliateCommissionUsd,
  formatUSD,
  toPlatformUsd,
} from "@/lib/currency/platform";
import { PLATFORM_SETTINGS_DEFAULTS } from "@/lib/platform-settings-shared";

function firstConfiguredRate(values: Array<number | null | undefined>): number | null {
  for (const candidate of values) {
    const n = Number(candidate);
    if (Number.isFinite(n) && n > 0) return Math.min(100, n);
  }
  return null;
}

export type ShareProductTarget = {
  id: string;
  slug: string;
  name: string;
  price: number;
  currency?: string | null;
  affiliateEnabled?: boolean;
  affiliateCommissionRate?: number | null;
};

export function buildCanonicalProductUrl(origin: string, slug: string): string {
  const base = origin.replace(/\/$/, "");
  return `${base}/marketplace/${slug}`;
}

type EarnState = "idle" | "loading" | "ready" | "needs_affiliate" | "unavailable";

export function ProductShareDialog({
  product,
  onClose,
  startOnEarn = false,
}: {
  product: ShareProductTarget;
  onClose: () => void;
  startOnEarn?: boolean;
}) {
  const [copied, setCopied] = useState<"product" | "affiliate" | null>(null);
  const [earnState, setEarnState] = useState<EarnState>(startOnEarn ? "loading" : "idle");
  const [affiliateUrl, setAffiliateUrl] = useState<string | null>(null);
  const [commissionRate, setCommissionRate] = useState<number | null>(null);
  const [earnError, setEarnError] = useState<string | null>(null);
  const started = React.useRef(false);

  const canonicalUrl =
    typeof window === "undefined"
      ? buildCanonicalProductUrl("https://www.jimvio.com", product.slug)
      : buildCanonicalProductUrl(window.location.origin, product.slug);

  async function copyText(value: string, which: "product" | "affiliate") {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(which);
      toast.success("Link copied");
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error("Could not copy link");
    }
  }

  async function shareProduct() {
    await copyText(canonicalUrl, "product");
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: product.name,
          url: canonicalUrl,
        });
      } catch {
        // Dismissed native share still leaves the copied link.
      }
    }
  }

  async function shareAndEarn() {
    setEarnState("loading");
    setEarnError(null);
    try {
      const res = await fetch("/api/affiliates/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id }),
      });
      if (res.status === 401) {
        const next = `/marketplace/${product.slug}?share=earn`;
        window.location.href = `/login?next=${encodeURIComponent(next)}`;
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (res.status === 403) {
        setEarnState("needs_affiliate");
        return;
      }
      if (!res.ok) {
        setEarnError(
          typeof data?.error === "string"
            ? data.error
            : "This product is not available for affiliate promotion.",
        );
        setEarnState("unavailable");
        return;
      }
      const link = data?.link ?? {};
      const url =
        (typeof link.full_url === "string" && link.full_url) ||
        (typeof link.short_url === "string" && link.short_url) ||
        null;
      if (!url) {
        setEarnError("Could not create your affiliate link.");
        setEarnState("unavailable");
        return;
      }
      const returnedRate = link.commission_rate != null ? Number(link.commission_rate) : null;
      const rate = firstConfiguredRate([
        Number.isFinite(returnedRate) ? returnedRate : null,
        product.affiliateCommissionRate,
        product.affiliateEnabled
          ? PLATFORM_SETTINGS_DEFAULTS.fees.default_affiliate_commission_percent
          : null,
      ]);
      setAffiliateUrl(url);
      setCommissionRate(rate);
      setEarnState("ready");
    } catch {
      setEarnError("Could not create your affiliate link.");
      setEarnState("unavailable");
    }
  }

  React.useEffect(() => {
    if (!startOnEarn || started.current) return;
    started.current = true;
    void shareAndEarn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startOnEarn]);

  const priceUsd = toPlatformUsd(Number(product.price ?? 0), product.currency);
  const earnings =
    commissionRate != null
      ? estimateAffiliateCommissionUsd(priceUsd, commissionRate)
      : null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/45 p-4 sm:items-center"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-share-title"
        className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="product-share-title" className="text-[16px] font-bold text-[var(--color-text-primary)]">
              Share this product
            </h2>
            <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
              Send the product link, or share your affiliate link.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close share dialog"
            className="grid h-8 w-8 place-items-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="rounded-xl border border-[var(--color-border)] p-4">
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--color-surface-secondary)]">
                <Share2 className="h-4 w-4 text-[var(--color-text-primary)]" />
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-[var(--color-text-primary)]">Share product</p>
                <p className="mt-1 text-[12px] leading-relaxed text-[var(--color-text-muted)]">
                  Send this product to friends or social platforms.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void shareProduct()}
              className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-text-primary)] text-[13px] font-semibold text-[var(--color-surface)]"
            >
              {copied === "product" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied === "product" ? "Link copied" : "Share product"}
            </button>
          </div>

          <div className="rounded-xl border border-[var(--color-border)] p-4">
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--color-accent-light)]">
                <Link2 className="h-4 w-4 text-[var(--color-accent)]" />
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-[var(--color-text-primary)]">Share & earn</p>
                <p className="mt-1 text-[12px] leading-relaxed text-[var(--color-text-muted)]">
                  Share your affiliate link and earn commission on qualifying sales.
                </p>
              </div>
            </div>

            {earnState === "idle" && (
              <button
                type="button"
                onClick={() => void shareAndEarn()}
                className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-xl bg-[var(--color-accent)] text-[13px] font-semibold text-white"
              >
                Share & earn
              </button>
            )}

            {earnState === "loading" && (
              <p className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 text-[13px] text-[var(--color-text-muted)]">
                <Loader2 className="h-4 w-4 animate-spin" />
                Preparing your affiliate link
              </p>
            )}

            {earnState === "needs_affiliate" && (
              <div className="mt-3 space-y-2">
                <p className="text-[12px] text-[var(--color-text-muted)]">
                  An active affiliate profile is required before a commission link can be created.
                </p>
                <Link
                  href="/activate/affiliate"
                  className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-[var(--color-accent)] text-[13px] font-semibold text-white"
                >
                  Activate affiliate
                </Link>
              </div>
            )}

            {earnState === "unavailable" && (
              <p className="mt-3 text-[12px] text-[var(--color-text-muted)]">
                {earnError ?? "Affiliate sharing is not available for this product."}
              </p>
            )}

            {earnState === "ready" && affiliateUrl && (
              <div className="mt-3 space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                  Your affiliate link
                </p>
                <p className="break-all rounded-lg bg-[var(--color-surface-secondary)] px-3 py-2 text-[12px] text-[var(--color-text-primary)]">
                  {affiliateUrl}
                </p>
                {commissionRate != null && earnings ? (
                  <div className="grid grid-cols-2 gap-2 text-[12px]">
                    <div className="rounded-lg border border-[var(--color-border)] px-3 py-2">
                      <p className="text-[var(--color-text-muted)]">Commission</p>
                      <p className="font-bold text-[var(--color-text-primary)]">{commissionRate}%</p>
                    </div>
                    <div className="rounded-lg border border-[var(--color-border)] px-3 py-2">
                      <p className="text-[var(--color-text-muted)]">Potential earnings</p>
                      <p className="font-bold text-[var(--color-text-primary)]">{formatUSD(earnings.amount)}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-[12px] text-[var(--color-text-muted)]">
                    Commission for this product is not configured yet.
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => void copyText(affiliateUrl, "affiliate")}
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-accent)] text-[13px] font-semibold text-white"
                >
                  {copied === "affiliate" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied === "affiliate" ? "Link copied" : "Copy affiliate link"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
