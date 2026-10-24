// components/checkout/OrderSummaryCard.tsx
"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
    CheckCircle2, Shield, ChevronRight, Lock, Loader2,
    ArrowRight, Pencil, Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatedPlatformStatValue } from "@/components/platform/platform-stats-provider";
import type { CartOrder, CartItem } from "@/types";
import { FieldInput } from "../ui/field-input";

interface OrderSummaryCardProps {
    orders: CartOrder[];
    items: CartItem[];
    subtotal: number;
    discount: number;
    shipping: number | null;
    total: number;
    currency: string;
    formatMoney: (v: number, c: string) => string;

    isAllDigital: boolean;
    features?: string[];

    promoCode: string;
    onPromoChange: (v: string) => void;
    onPromoApply: () => void;
    promoApplying?: boolean;

    onEditOrder?: () => void;
    onPay: () => void;
    paySubmitting: boolean;
    payDisabled: boolean;

    socialProofAvatars?: (string | null)[];
}

export function OrderSummaryCard({
    orders: _orders, items, subtotal, discount, shipping, total, currency, formatMoney,
    isAllDigital, features,
    promoCode, onPromoChange, onPromoApply, promoApplying,
    onEditOrder, onPay, paySubmitting, payDisabled,
    socialProofAvatars = [],
}: OrderSummaryCardProps) {
    const [detailsOpen, setDetailsOpen] = useState(false);

    const defaultFeatures = [
        "Payment first · Download access is created only after payment is confirmed",
        "Refunds · Eligibility follows the product terms. A download does not end it by itself",
    ];
    const featureList = features ?? (isAllDigital ? defaultFeatures : []);
    const heroItem = items[0];

    return (
        <div className="space-y-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] max-lg:shadow-[0_4px_20px_rgba(0,0,0,0.06)] max-lg:p-5">

            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-[15px] font-bold text-[var(--color-text-primary)]">
                    Order Summary
                </h2>
                {onEditOrder && (
                    <button
                        type="button"
                        onClick={onEditOrder}
                        className="inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--color-accent)] transition-opacity hover:opacity-80"
                    >
                        <Pencil className="h-3 w-3" />
                        Edit order
                    </button>
                )}
            </div>

            {/* Big total */}
            <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                    Total due
                </p>
                <p className="mt-1 text-[30px] font-extrabold leading-none tracking-[-0.03em] text-[var(--color-accent)] tabular-nums max-lg:text-[32px]">
                    {formatMoney(total, currency)}
                </p>
            </div>

            {/* Hero product preview */}
            {heroItem && (
                <div className="flex items-center gap-3 border-b border-[var(--color-border)] pb-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
                        {heroItem.product_image ? (
                            <Image
                                src={heroItem.product_image}
                                alt={heroItem.product_name}
                                width={56}
                                height={56}
                                className="h-full w-full object-cover [image-rendering:auto]"
                            />
                        ) : null}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-[var(--color-text-primary)] line-clamp-2 leading-snug">
                            {heroItem.product_name}
                        </p>
                        <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                            Qty: {heroItem.quantity} <span className="mx-1">·</span> {heroItem.product_type}
                        </p>
                    </div>
                    <p className="text-[13px] font-semibold text-[var(--color-text-primary)] flex-shrink-0">
                        {formatMoney(heroItem.unit_price, currency)}
                    </p>
                </div>
            )}

            {/* View order details — expandable for multi-item carts */}
            {items.length > 1 && (
                <button
                    onClick={() => setDetailsOpen((o) => !o)}
                    className="flex w-full items-center justify-between text-[12.5px] font-medium text-[var(--color-accent)] transition-opacity hover:opacity-80"
                >
                    <span>View order details ({items.length - 1} more {items.length === 2 ? "item" : "items"})</span>
                    <ChevronRight className={cn(
                        "h-3.5 w-3.5 transition-transform",
                        detailsOpen && "rotate-90"
                    )} />
                </button>
            )}

            {detailsOpen && items.length > 1 && (
                <div className="space-y-2 pb-3 border-b border-[var(--color-border)]">
                    {items.slice(1).map((item) => (
                        <div key={item.id} className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
                                {item.product_image && (
                                    <Image
                                        src={item.product_image}
                                        alt={item.product_name}
                                        width={36}
                                        height={36}
                                        className="w-full h-full object-cover"
                                    />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[12px] font-medium text-[var(--color-text-primary)] truncate">
                                    {item.product_name}
                                </p>
                                <p className="text-[10.5px] text-[var(--color-text-muted)]">Qty {item.quantity}</p>
                            </div>
                            <p className="text-[12px] font-semibold text-[var(--color-text-primary)] flex-shrink-0">
                                {formatMoney(item.unit_price, currency)}
                            </p>
                        </div>
                    ))}
                </div>
            )}

            {/* Feature checklist */}
            {featureList.length > 0 && (
                <div className="space-y-2.5 pb-3 border-b border-[var(--color-border)]">
                    {featureList.map((feat) => {
                        const [title, sub] = feat.split(" · ");
                        return (
                            <div key={feat} className="flex items-start gap-2.5">
                                <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                                <div className="leading-tight">
                                    <p className="text-[12.5px] font-semibold text-[var(--color-text-primary)]">
                                        {title}
                                    </p>
                                    {sub && (
                                        <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">{sub}</p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
            {/* Promo code */}
            <div className="flex items-center gap-2">
                <div className="relative flex-1">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--color-text-muted)] pointer-events-none" />
                    <FieldInput
                        value={promoCode}
                        onChange={(e) => onPromoChange(e.target.value)}
                        placeholder="Enter promo code (e.g. JIMVIO10)"
                        className="pl-9 pr-3 h-10 w-full placeholder:text-[var(--color-text-muted)]/80"
                    />
                </div>
                <button
                    onClick={onPromoApply}
                    disabled={!promoCode.trim() || promoApplying}
                    className={cn(
                        "flex h-10 items-center justify-center rounded-xl px-4 text-[12.5px] font-semibold text-[var(--color-accent)]",
                        "transition-[transform,background-color] duration-200 hover:bg-[var(--color-accent-light)]",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/35 focus-visible:ring-offset-2",
                        "disabled:opacity-40",
                    )}
                >
                    {promoApplying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Apply"}
                </button>
            </div>

            {/* Breakdown */}
            <div className="space-y-1.5">
                <div className="flex justify-between text-[12.5px]">
                    <span className="text-[var(--color-text-muted)]">Subtotal</span>
                    <span className="text-[var(--color-text-primary)] font-medium tabular-nums">
                        {formatMoney(subtotal, currency)}
                    </span>
                </div>
                <div className="flex justify-between text-[12.5px]">
                    <span className="text-[var(--color-text-muted)]">Discount</span>
                    <span className={cn(
                        "font-medium tabular-nums",
                        discount > 0 ? "text-emerald-600" : "text-[var(--color-text-muted)]"
                    )}>
                        {discount > 0 ? `- ${formatMoney(discount, currency)}` : `- ${currency} 0`}
                    </span>
                </div>
                <div className="flex justify-between text-[12.5px]">
                    <span className="text-[var(--color-text-muted)]">Shipping</span>
                    <span className={cn(
                        "font-medium tabular-nums",
                        shipping === null
                            ? "text-[var(--color-text-muted)]"
                            : shipping === 0
                                ? "text-emerald-600"
                                : "text-[var(--color-text-primary)]"
                    )}>
                        {shipping === null ? "Calculating…" : shipping === 0 ? "Free" : formatMoney(shipping, currency)}
                    </span>
                </div>
            </div>

            <div className="flex items-baseline justify-between border-t border-[var(--color-border)] pt-4">
                <span className="text-[14px] font-bold text-[var(--color-text-primary)]">Total</span>
                <span className="text-[20px] font-extrabold tabular-nums tracking-[-0.02em] text-[var(--color-accent)]">
                    {formatMoney(total, currency)}
                </span>
            </div>

            {/* Buyer Protection */}
            <div className="flex items-start gap-3 rounded-xl border border-sky-200/80 bg-sky-50/80 p-3.5 dark:border-sky-900/40 dark:bg-sky-950/20">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sky-500/10">
                    <Shield className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                </span>
                <div className="min-w-0 leading-tight">
                    <p className="text-[12px] font-bold text-sky-900 dark:text-sky-300">
                        Buyer Protection Guarantee
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-sky-800/80 dark:text-sky-400/80">
                        Your purchase is protected. If you&apos;re not satisfied, we&apos;ll make it right.
                    </p>
                </div>
            </div>

            {/* CTA — desktop; mobile uses checkout sticky bar */}
            <button
                type="button"
                onClick={onPay}
                disabled={paySubmitting || payDisabled}
                className={cn(
                    "hidden h-12 w-full items-center justify-center gap-2 rounded-xl text-[14px] font-bold text-white lg:flex",
                    "bg-[var(--color-accent)] shadow-[0_4px_14px_rgba(253,80,0,0.22)]",
                    "transition-[transform,background-color,box-shadow,opacity] duration-200",
                    "hover:scale-[1.01] hover:bg-[var(--color-accent)]/90",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40 focus-visible:ring-offset-2",
                    "active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100",
                )}
            >
                {paySubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    <>
                        <Lock className="h-4 w-4" />
                        Complete Secure Payment
                        <ArrowRight className="h-4 w-4" />
                    </>
                )}
            </button>

            <p className="text-[11px] text-[var(--color-text-muted)] text-center">
                You won&apos;t be charged until payment is confirmed.
            </p>

            {/* Social proof */}
            <div className="flex items-center gap-2.5 pt-1">
                <div className="flex -space-x-2">
                    {(socialProofAvatars.length > 0 ? socialProofAvatars : [null, null, null]).slice(0, 3).map((src, i) => (
                        <div
                            key={i}
                            className="w-6 h-6 rounded-full border-2 border-[var(--color-surface)] bg-gradient-to-br from-orange-200 to-orange-400 overflow-hidden flex items-center justify-center text-[9px] font-bold text-white"
                        >
                            {src ? (
                                <img src={src} alt="" className="w-full h-full object-cover" />
                            ) : (
                                ["A", "B", "C"][i]
                            )}
                        </div>
                    ))}
                </div>
                <p className="text-[11px] text-[var(--color-text-muted)] flex-1">
                    Trusted by <AnimatedPlatformStatValue statKey="users" /> happy customers
                </p>
                <div className="flex items-center gap-1">
                    <div className="flex">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <svg key={i} className="h-3 w-3 text-amber-400 fill-current" viewBox="0 0 20 20">
                                <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                            </svg>
                        ))}
                    </div>
                    <span className="text-[11px] font-bold text-[var(--color-text-primary)] tabular-nums">
                        4.9/5
                    </span>
                </div>
            </div>
        </div>
    );
}