"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
    Star, TrendingUp, Clock, ThumbsUp, CheckCircle2,
    ChevronRight, ChevronDown, Users, DollarSign,
    ExternalLink, Share2, Heart, BadgeCheck, Globe,
    Package,
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Product, Vendor } from "@/types/db";
import { CurrencyCode } from "@/lib/currency/config";



export interface SharedVendor {
    id: string;
    business_name?: string | null;
    business_logo?: string | null;
    business_slug?: string | null;
    follower_count?: number;
    product_count?: number;
}

// ─── Breadcrumb ───────────────────────────────────────────────────────────────

export function ProductBreadcrumb({ productName }: { productName: string }) {
    return (
        <div className="sticky top-[var(--navbar-height,64px)] z-30 border-b border-[var(--color-border)] bg-[var(--color-bg)]/90 backdrop-blur-sm">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 h-11 flex items-center">
                <nav className="flex items-center gap-1.5 text-[10px] font-medium text-[var(--color-text-muted)] min-w-0">
                    <Link href="/" className="hover:text-[var(--color-accent)] transition-colors">Home</Link>
                    <ChevronRight className="h-3 w-3 opacity-40 shrink-0" />
                    <Link href="/marketplace" className="hover:text-[var(--color-accent)] transition-colors">Shop</Link>
                    <ChevronRight className="h-3 w-3 opacity-40 shrink-0" />
                    <span className="text-[var(--color-text-primary)] font-semibold truncate max-w-[180px] sm:max-w-xs">
                        {productName}
                    </span>
                </nav>
            </div>
        </div>
    );
}

// ─── Save / Share bar ─────────────────────────────────────────────────────────

export function SaveShareBar() {
    const [saved, setSaved] = useState(false);
    const [copied, setCopied] = useState(false);

    function handleShare() {
        navigator.clipboard.writeText(window.location.href)
            .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })
            .catch(() => toast.error("Could not copy link"));
    }

    return (
        <div className="flex items-center gap-2">
            <button
                onClick={() => setSaved(v => !v)}
                aria-label={saved ? "Remove from saved" : "Save product"}
                className={cn(
                    "h-8 w-8 rounded-lg border flex items-center justify-center transition-all",
                    saved
                        ? "border-rose-300 bg-rose-50 text-rose-500 dark:border-rose-500/30 dark:bg-rose-500/10"
                        : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)]"
                )}
            >
                <Heart className={cn("h-3.5 w-3.5 transition-all", saved && "fill-rose-500")} />
            </button>
            <button
                onClick={handleShare}
                aria-label="Share product"
                className="h-8 w-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)] flex items-center justify-center transition-all"
            >
                <Share2 className="h-3.5 w-3.5" />
            </button>
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
    const items = [
        { icon: <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />, text: saleCount > 0 ? `${saleCount.toLocaleString()}+ users` : "New Product" },
        { icon: <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />, text: reviewCount > 0 ? `${reviewCount} reviews` : "Not rated yet" },
        { icon: <Clock className="h-3.5 w-3.5 text-sky-500" />, text: "Updated recently" },
        { icon: <ThumbsUp className="h-3.5 w-3.5 text-violet-500" />, text: "97% recommend" },
    ];
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

    const rate = product.affiliate_commission_rate ?? 10;
    const earnPerSale = ((product.price * rate) / 100).toFixed(2);
    const currencySymbol = product.currency === "USD" ? "$" : product.currency;

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
                            {currencySymbol}{earnPerSale}
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
                        { label: "You earn", value: `${currencySymbol}${earnPerSale}` },
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
                        href={`/affiliate?product=${product.slug}`}
                        className="flex-1 inline-flex items-center justify-center gap-2 h-10 px-5 rounded-xl text-[13px] font-bold text-white transition-opacity hover:opacity-90"
                        style={{ background: "var(--color-accent)" }}
                    >
                        Get my affiliate link
                        <ExternalLink className="h-3.5 w-3.5" />
                    </Link>

                    <Link
                        href="/affiliate"
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
                <a href="/support" className="text-[var(--color-accent)] font-semibold hover:underline">
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
                                {vendor.follower_count ? ` · ${vendor.follower_count.toLocaleString()} followers` : ""}
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
    formatMoney: (price: number, currency: CurrencyCode) => string;
}) {
    if (!products.length) return null;
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-[var(--color-text-primary)] tracking-tight">
                    You might also like
                </h2>
                <Link
                    href="/marketplace"
                    className="text-xs font-semibold text-[var(--color-accent)] hover:opacity-80 transition-opacity flex items-center gap-1"
                >
                    View all <ChevronRight className="h-3 w-3" />
                </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {products.slice(0, 3).map(rp => (
                    <Link
                        key={rp.id}
                        href={`/marketplace/${rp.slug}`}
                        className="group rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden hover:border-[var(--color-border-strong)] hover:shadow-sm transition-all"
                    >
                        <div className="aspect-square bg-[var(--color-surface-secondary)] overflow-hidden">
                            {rp.images?.[0] ? (
                                <img
                                    src={rp.images[0]}
                                    alt={rp.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <Package className="h-8 w-8 text-[var(--color-border)]" />
                                </div>
                            )}
                        </div>
                        <div className="p-3">
                            <p className="text-xs font-semibold text-[var(--color-text-primary)] truncate leading-snug">
                                {rp.name}
                            </p>
                            <p className="text-xs font-bold mt-1" style={{ color: "var(--color-accent)" }}>
                                {formatMoney(Number(rp.price), rp.currency)}
                            </p>
                            {rp.affiliate_enabled && (
                                <span
                                    className="inline-block mt-1 text-[9px] font-bold px-1.5 py-0.5 rounded"
                                    style={{ background: "rgba(253,80,0,0.08)", color: "var(--color-accent)" }}
                                >
                                    {rp.affiliate_commission_rate ?? 10}% affiliate
                                </span>
                            )}
                        </div>
                    </Link>
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