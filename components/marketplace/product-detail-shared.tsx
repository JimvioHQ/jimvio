"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
    Star, TrendingUp, ThumbsUp, CheckCircle2,
    ChevronRight, ChevronDown, Users,
    Share2, Heart, BadgeCheck, Globe,
    Package, Zap,
    ExternalLink,
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Product, Vendor } from "@/types/db";
import { CurrencyCode } from "@/lib/currency/config";
import { PLATFORM_SETTINGS_DEFAULTS } from "@/lib/platform-settings-shared";
import { formatFollowersLabel, storefrontFollowerCount } from "@/lib/marketplace/store-display";
import { productHasTrendingSignal, productHasVerifiedSupplier } from "@/lib/marketplace/product-signals";
import {
  estimateAffiliateCommissionUsd,
  formatUSD,
  resolveCommissionRatePercent,
  toPlatformUsd,
} from "@/lib/currency/platform";
import { StockStatusBadge } from "@/components/marketplace/stock-status-badge";
import {
  ProductShareDialog,
  type ShareProductTarget,
} from "@/components/marketplace/product-share-dialog";

/** Public sales counts stay hidden while Jimvio is young. */
const SHOW_SALES = false;


const DEFAULT_AFFILIATE_RATE =
  PLATFORM_SETTINGS_DEFAULTS.fees.default_affiliate_commission_percent;



export interface SharedVendor {
    id: string;
    business_name?: string | null;
    business_logo?: string | null;
    business_slug?: string | null;
    follower_count?: number;
    display_follower_count?: number | null;
    product_count?: number;
}

// ─── Product title badges (PDP only) ─────────────────────────────────────────

const TITLE_CHIP =
  "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-transform duration-300 ease-out hover:scale-[1.02]";

const PHYSICAL_TITLE_CHIP =
  "inline-flex h-[26px] items-center gap-1 rounded-full px-2.5 text-[10px] font-semibold leading-none md:text-[11px]";

export function ProductTitleBadges({
  vendor,
  product,
  isFreeShipping = false,
  variant = "physical",
  showFastShippingBadge = false,
}: {
  vendor?: { verification_status?: string | null } | null;
  product: {
    sale_count?: number | null;
    sold_count?: number | null;
    view_count?: number | null;
    delivery_time?: string | null;
    source_metadata?: unknown;
    inventory_quantity?: number | null;
    source?: string | null;
  };
  isFreeShipping?: boolean;
  /** Only show when actual shipping data supports fast/free shipping. */
  showFastShippingBadge?: boolean;
  variant?: "physical" | "digital";
}) {
  const isVerifiedSupplier = productHasVerifiedSupplier({
    vendors: vendor,
    source_metadata: product.source_metadata,
  });
  // Sales counts are not shown publicly while Jimvio is young.
  const isBestseller = false;
  const isTrending = productHasTrendingSignal(product);
  const showFastShipping = variant === "physical" && (showFastShippingBadge || isFreeShipping);

  if (variant === "physical") {
    return (
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        {showFastShipping && (
          <span
            className={cn(
              PHYSICAL_TITLE_CHIP,
              isFreeShipping
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300"
                : "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
            )}
          >
            <Zap className="h-3 w-3" />
            {isFreeShipping ? "Free Shipping" : "Fast Shipping"}
          </span>
        )}
        {isVerifiedSupplier && (
          <span
            className={cn(
              PHYSICAL_TITLE_CHIP,
              "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300",
            )}
          >
            <BadgeCheck className="h-3 w-3" />
            Jimvio Verified
          </span>
        )}
        {isBestseller && (
          <span
            className={cn(
              PHYSICAL_TITLE_CHIP,
              "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
            )}
          >
            <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
            Bestseller
          </span>
        )}
        {isTrending && (
          <span
            className={cn(
              PHYSICAL_TITLE_CHIP,
              "bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300",
            )}
          >
            <TrendingUp className="h-3 w-3" />
            Trending
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      {isVerifiedSupplier && (
        <span
          className={cn(
            TITLE_CHIP,
            "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
          )}
        >
          <BadgeCheck className="h-3 w-3" />
          Jimvio Verified
        </span>
      )}
      {isBestseller && (
        <span
          className={cn(
            TITLE_CHIP,
            "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
          )}
        >
          <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
          Bestseller
        </span>
      )}
      {isTrending && (
        <span
          className={cn(
            TITLE_CHIP,
            "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
          )}
        >
          <TrendingUp className="h-3 w-3" />
          Trending
        </span>
      )}
      {showFastShipping && (
        <span
          className={cn(
            TITLE_CHIP,
            "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
          )}
        >
          <Zap className="h-3 w-3" />
          {isFreeShipping ? "Free Shipping" : "Fast Shipping"}
        </span>
      )}
    </div>
  );
}

// ─── Breadcrumb ───────────────────────────────────────────────────────────────

export function ProductBreadcrumb({ productName }: { productName: string }) {
    return (
        <nav className="flex min-w-0 flex-1 items-center gap-1.5 text-[10px] font-medium text-[var(--color-text-muted)]">
            <Link href="/" className="shrink-0 hover:text-[var(--color-accent)] transition-colors">Home</Link>
            <ChevronRight className="h-3 w-3 shrink-0 opacity-40" />
            <Link href="/marketplace" className="shrink-0 hover:text-[var(--color-accent)] transition-colors">Shop</Link>
            <ChevronRight className="h-3 w-3 shrink-0 opacity-40" />
            <span className="min-w-0 truncate font-semibold text-[var(--color-text-primary)]">
                {productName}
            </span>
        </nav>
    );
}

// ─── Save / Share bar ─────────────────────────────────────────────────────────

export function SaveShareBar({ product }: { product?: ShareProductTarget }) {
    const [saved, setSaved] = useState(false);
    const [earnIntent] = useState(() => {
        if (typeof window === "undefined") return false;
        return new URLSearchParams(window.location.search).get("share") === "earn";
    });
    const [shareOpen, setShareOpen] = useState(earnIntent);

    return (
        <div className="flex items-center gap-2">
            <button
                type="button"
                onClick={() => setSaved(v => !v)}
                aria-label={saved ? "Remove from saved" : "Save product"}
                aria-pressed={saved}
                className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-xl border transition-[transform,background-color,border-color] duration-200",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/35 focus-visible:ring-offset-2",
                    "hover:scale-[1.03] active:scale-[0.97]",
                    saved
                        ? "border-rose-300 bg-rose-50 text-rose-500 dark:border-rose-500/30 dark:bg-rose-500/10"
                        : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-secondary)]"
                )}
            >
                <Heart className={cn("h-3.5 w-3.5 transition-all", saved && "fill-rose-500")} />
            </button>
            <button
                type="button"
                onClick={() => setShareOpen(true)}
                aria-label="Share product"
                className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] transition-[transform,background-color,border-color] duration-200",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/35 focus-visible:ring-offset-2",
                    "hover:scale-[1.03] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-secondary)] active:scale-[0.97]",
                )}
            >
                <Share2 className="h-3.5 w-3.5" />
            </button>
            {shareOpen && product ? (
                <ProductShareDialog
                    product={product}
                    startOnEarn={earnIntent}
                    onClose={() => setShareOpen(false)}
                />
            ) : null}
        </div>
    );
}

// ─── Social proof bar ─────────────────────────────────────────────────────────

export function SocialProofBar({
    saleCount,
    reviewCount,
}: {
    saleCount: number;
    reviewCount: number;
}) {
    const items: Array<{ icon: React.ReactNode; text: string }> = [];
    if (SHOW_SALES && saleCount > 0) {
        items.push({
            icon: <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />,
            text: `${saleCount.toLocaleString()}+ sold`,
        });
    }
    if (reviewCount > 0) {
        items.push({
            icon: <ThumbsUp className="h-3.5 w-3.5 text-violet-500" />,
            text: `${reviewCount.toLocaleString()} reviews`,
        });
    }
    if (items.length === 0) return null;
    return (
        <div className="flex flex-wrap items-center gap-3 py-3 px-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
            {items.map((item, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[12px] text-[var(--color-text-secondary)]">
                    {item.icon}
                    <span>{item.text}</span>
                </div>
            ))}
        </div>
    );
}


export function AffiliateBanner({ product }: { product: Product }) {
    if (!product.affiliate_enabled) return null;

    const rate = resolveCommissionRatePercent({
      productRate: product.affiliate_commission_rate,
      platformDefault: DEFAULT_AFFILIATE_RATE,
    });
    const priceUsd = toPlatformUsd(Number(product.price ?? 0), product.currency);
    const { amount: earnUsd } = estimateAffiliateCommissionUsd(priceUsd, rate);
    const earnLabel = formatUSD(earnUsd);

    return (
        <div className="rounded-2xl border border-[var(--color-border)] overflow-hidden">
            {/* Top label */}
            <div className="px-5 py-2.5 flex items-center justify-between border-b border-[var(--color-border)]"
                style={{ background: "var(--color-surface-secondary)" }}>
                <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
                        Affiliate programme
                    </p>
                </div>
                <span
                    className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                    style={{
                        background: "rgba(253,80,0,0.08)",
                        color: "var(--color-accent)",
                    }}
                >
                    {rate}% commission
                </span>
            </div>

            <div className="p-5 space-y-5" style={{ background: "var(--color-surface)" }}>
                {/* Headline */}
                <div>
                    <p className="text-[15px] font-semibold text-[var(--color-text-primary)] leading-snug">
                        Earn{" "}
                        <span style={{ color: "var(--color-accent)" }}>
                            {earnLabel}
                        </span>{" "}
                        every time someone buys through your link
                    </p>
                    <p className="text-[13px] text-[var(--color-text-muted)] mt-1 leading-relaxed">
                        Share once. Get paid automatically on every sale — no follow-up needed.
                    </p>
                </div>

                {/* Stats — minimal, horizontal */}
                <div
                    className="grid grid-cols-3 divide-x rounded-xl overflow-hidden"
                    style={{
                        border: "1px solid var(--color-border)",
                    }}
                >
                    {[
                        { label: "You earn", value: earnLabel },
                        { label: "Commission", value: `${rate}%` },
                        { label: "Payout", value: "Instant" },
                    ].map((stat, i) => (
                        <div
                            key={i}
                            className="flex flex-col items-center text-center py-3 px-2"
                            style={{ background: "var(--color-surface-secondary)" }}
                        >
                            <p
                                className="text-[15px] font-bold tabular-nums"
                                style={{ color: "var(--color-text-primary)" }}
                            >
                                {stat.value}
                            </p>
                            <p className="text-[10px] mt-0.5 font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
                                {stat.label}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Steps — inline, not a vertical list */}
                <div className="flex flex-col gap-2">
                    {[
                        { n: "1", text: "Get your unique link below" },
                        { n: "2", text: "Share it — social, blog, email, anywhere" },
                        { n: "3", text: "Earn on every purchase through your link" },
                    ].map(({ n, text }) => (
                        <div key={n} className="flex items-center gap-3">
                            <span
                                className="text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                                style={{
                                    background: "var(--color-surface-secondary)",
                                    border: "1px solid var(--color-border)",
                                    color: "var(--color-text-muted)",
                                }}
                            >
                                {n}
                            </span>
                            <span className="text-[13px] text-[var(--color-text-secondary)]">{text}</span>
                        </div>
                    ))}
                </div>

                {/* CTAs */}
                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <Link
                        href={`/affiliates/promote/${encodeURIComponent(product.slug)}`}
                        className="flex-1 inline-flex items-center justify-center gap-2 h-10 px-5 rounded-xl text-[13px] font-bold text-white transition-opacity hover:opacity-90"
                        style={{ background: "var(--color-accent)" }}
                    >
                        Get my affiliate link
                        <ExternalLink className="h-3.5 w-3.5" />
                    </Link>

                    <Link
                        href="/affiliates"
                        className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl text-[12px] font-medium border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-strong)] transition-colors"
                    >
                        <Users className="h-3.5 w-3.5" />
                        Browse all
                    </Link>
                </div>
            </div>
        </div>
    );
}

// ─── FAQ accordion ────────────────────────────────────────────────────────────

export const DEFAULT_FAQ = [
    {
        q: "What format are the files delivered in?",
        a: "You'll receive a ZIP archive containing all source files. Access is instant — no waiting for approval.",
    },
    {
        q: "Can I use this for commercial projects?",
        a: "Yes. A commercial use license is included with every purchase for both digital and physical products.",
    },
    {
        q: "What if I need help or find a bug?",
        a: "Message the creator directly through the platform. Most respond within 24 hours.",
    },
    {
        q: "Is there a refund policy?",
        a: "Purchases are covered by Jimvio's 7-day buyer protection. Contact support for a full review if anything's wrong.",
    },
];

export function FaqItem({ q, a }: { q: string; a: string }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="border-t border-[var(--color-border)] py-3.5">
            <button
                onClick={() => setOpen(v => !v)}
                aria-expanded={open}
                className="w-full flex items-center justify-between gap-3 text-left"
            >
                <span className="text-[13px] font-semibold text-[var(--color-text-primary)]">{q}</span>
                <ChevronDown
                    className={cn(
                        "h-4 w-4 flex-shrink-0 text-[var(--color-text-muted)] transition-transform duration-200",
                        open && "rotate-180"
                    )}
                />
            </button>
            {open && (
                <p className="mt-2.5 text-[13px] text-[var(--color-text-muted)] leading-relaxed">{a}</p>
            )}
        </div>
    );
}

export function FaqSection() {
    return (
        <div>
            {DEFAULT_FAQ.map(item => (
                <FaqItem key={item.q} q={item.q} a={item.a} />
            ))}
            <p className="mt-5 text-[12px] text-[var(--color-text-muted)]">
                Still have questions?{" "}
                <a href="/help" className="text-[var(--color-accent)] font-semibold hover:underline">
                    Contact support →
                </a>
            </p>
        </div>
    );
}

// ─── Community access card ────────────────────────────────────────────────────

export function CommunityAccessCard({
    vendorSlug,
    productName,
}: {
    vendorSlug?: string | null;
    productName: string;
}) {
    return (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2 mb-1">
                <Users className="h-4 w-4 text-violet-500" />
                <p className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-widest">
                    Community access
                </p>
            </div>
            <p className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
                Buyers get access to the creator's community — ask questions, share work, and get feedback from
                other users of {productName}.
            </p>
            <ul className="space-y-2">
                {[
                    "Private buyer Discord or Slack channel",
                    "Monthly live Q&A with the creator",
                    "Exclusive template updates and previews",
                ].map(item => (
                    <li key={item} className="flex items-start gap-2.5 text-[12px] text-[var(--color-text-secondary)]">
                        <CheckCircle2 className="h-3.5 w-3.5 text-violet-500 flex-shrink-0 mt-0.5" />
                        {item}
                    </li>
                ))}
            </ul>
            {vendorSlug && (
                <a
                    href={`/vendors/${vendorSlug}`}
                    className="inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--color-accent)] hover:underline mt-1"
                >
                    Visit creator profile
                    <ChevronDown className="h-3 w-3 -rotate-90" />
                </a>
            )}
        </div>
    );
}

// ─── Urgency strip ────────────────────────────────────────────────────────────

export function UrgencyStrip({ saleCount }: { saleCount: number }) {
    return (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
            <p className="text-[12px] font-semibold text-amber-800 dark:text-amber-400">
                {saleCount === 0
                    ? "New Product"
                    : saleCount > 50
                        ? `${saleCount.toLocaleString()}+ people already own this`
                        : "Limited time — price may increase soon"}
            </p>
        </div>
    );
}

// ─── Vendor mini card ─────────────────────────────────────────────────────────

export function VendorCard({
    vendor,
    followedVendorIds,
    followButton,
}: {
    vendor: Vendor;
    followedVendorIds: string[];
    followButton?: React.ReactNode;
}) {
    return (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5">
            <p className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-widest mb-3">
                Secured by Jimvio
            </p>
            <div className="divide-y divide-[var(--color-border)] mb-4">
                {[
                    { title: "Encrypted delivery", desc: "End-to-end encrypted asset distribution" },
                    { title: "Verified source", desc: "Rigorous quality check on all files" },
                    { title: "Purchase protection", desc: "Funds held until you confirm access" },
                ].map(item => (
                    <div key={item.title} className="flex items-start gap-3 py-3">
                        <span className="mt-[5px] h-1.5 w-1.5 rounded-full bg-sky-500 flex-shrink-0" />
                        <div>
                            <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">{item.title}</p>
                            <p className="text-[12px] text-[var(--color-text-muted)] mt-0.5 leading-relaxed">{item.desc}</p>
                        </div>
                    </div>
                ))}
            </div>
            <div className="pt-3 border-t border-[var(--color-border)]">
                <div className="flex items-center gap-3 mb-3">
                    <div className="h-10 w-10 rounded-xl flex-shrink-0 overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface-secondary)] flex items-center justify-center">
                        {vendor.business_logo ? (
                            <Image
                                src={vendor.business_logo}
                                alt={vendor.business_name ?? "Vendor"}
                                width={40}
                                height={40}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <Globe className="h-4 w-4 text-[var(--color-text-muted)]" />
                        )}
                    </div>
                    <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-[var(--color-text-primary)] truncate">
                            {vendor.business_name}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <BadgeCheck className="h-3 w-3 text-sky-500 flex-shrink-0" />
                            <p className="text-[11px] text-[var(--color-text-muted)]">
                                Verified creator
                                {storefrontFollowerCount(vendor) > 0
                                  ? ` · ${formatFollowersLabel(storefrontFollowerCount(vendor))}`
                                  : ""}
                            </p>
                        </div>
                    </div>
                </div>
                {followButton}
            </div>
        </div>
    );
}

// ─── Related products ─────────────────────────────────────────────────────────

export function RelatedProducts({
    products,
    formatMoney,
}: {
    products: any[];
    formatMoney: (price: number, currency: CurrencyCode, displayCurrency?: CurrencyCode) => string;
}) {
    if (!products.length) return null;
    return (
        <div className="space-y-5">
            <div className="flex items-end justify-between gap-3">
                <div>
                    <h2 className="text-lg font-bold tracking-[-0.02em] text-[var(--color-text-primary)]">
                        Related products
                    </h2>
                    <p className="mt-0.5 text-[13px] text-[var(--color-text-muted)]">
                        More products you may like
                    </p>
                </div>
                <Link
                    href="/marketplace"
                    className="flex shrink-0 items-center gap-1 text-xs font-semibold text-[var(--color-accent)] transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/35 focus-visible:ring-offset-2 rounded-md"
                >
                    View all <ChevronRight className="h-3 w-3" />
                </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
                {products.slice(0, 8).map(rp => (
                    <div
                        key={rp.id}
                        className={cn(
                            "group flex flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]",
                            "transition-[transform,border-color,box-shadow] duration-300 ease-out",
                            "hover:border-[var(--color-border-strong)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)]",
                        )}
                    >
                        <Link
                          href={`/marketplace/${rp.slug}`}
                          className="relative aspect-square overflow-hidden bg-[var(--color-surface-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/35"
                        >
                            {rp.images?.[0] ? (
                                <img
                                    src={rp.images[0]}
                                    alt={rp.name}
                                    loading="lazy"
                                    decoding="async"
                                    className="h-full w-full object-cover transition-[transform,opacity] duration-500 group-hover:scale-[1.04] [image-rendering:auto]"
                                />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                    <Package className="h-8 w-8 text-[var(--color-border)]" />
                                </div>
                            )}
                        </Link>
                        <div className="flex flex-1 flex-col gap-1.5 p-3.5">
                            <Link
                              href={`/marketplace/${rp.slug}`}
                              className="truncate text-xs font-semibold leading-snug text-[var(--color-text-primary)] hover:text-[var(--color-accent)]"
                            >
                                {rp.name}
                            </Link>
                            <p className="text-sm font-bold text-[var(--color-accent)]">
                                {formatMoney(Number(rp.price), rp.currency, "USD")}
                            </p>
                            <StockStatusBadge
                              size="sm"
                              input={{
                                inventory_quantity: rp.inventory_quantity,
                                track_inventory: rp.track_inventory,
                                low_stock_threshold: rp.low_stock_threshold,
                              }}
                            />
                            <Link
                              href={`/marketplace/${rp.slug}`}
                              className="mt-auto inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-3 text-[11px] font-semibold text-white transition-opacity hover:opacity-90"
                            >
                              View product
                            </Link>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function BenefitCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
    return (
        <div className="flex gap-3 p-4 rounded-xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)]">
            <div className="h-8 w-8 rounded-lg flex-shrink-0 flex items-center justify-center bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)]">
                {icon}
            </div>
            <div>
                <p className="text-[13px] font-semibold text-[var(--color-text-primary)] mb-0.5">{title}</p>
                <p className="text-[12px] text-[var(--color-text-muted)] leading-relaxed">{desc}</p>
            </div>
        </div>
    );
}