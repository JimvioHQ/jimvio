// components/checkout/OrderSummaryCard.tsx
"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
    CheckCircle2, Shield, ChevronRight, Lock, Loader2,
    ArrowRight, Pencil, Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CartOrder, CartItem } from "@/types";

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

    /** Avatars to show as social proof. URLs or null for fallback. */
    socialProofAvatars?: (string | null)[];
}

export function OrderSummaryCard({
    orders, items, subtotal, discount, shipping, total, currency, formatMoney,
    isAllDigital, features,
    promoCode, onPromoChange, onPromoApply, promoApplying,
    onEditOrder, onPay, paySubmitting, payDisabled,
    socialProofAvatars = [],
}: OrderSummaryCardProps) {
    const [detailsOpen, setDetailsOpen] = useState(false);

    // Default feature list for digital products
    const defaultFeatures = [
        "Digital product · Instant access after payment",
        "Access on all devices · Mobile, tablet & desktop",
        "Lifetime access · One-time payment",
    ];
    const featureList = features ?? (isAllDigital ? defaultFeatures : []);
    const heroItem = items[0];

    return (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 space-y-4">

            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-[15px] font-bold text-[var(--color-text-primary)]">
                    Order Summary
                </h2>
                {onEditOrder && (
                    <button
                        onClick={onEditOrder}
                        className="inline-flex items-center gap-1 text-[12px] font-semibold text-blue-500 hover:text-blue-600 transition-colors"
                    >
                        <Pencil className="h-3 w-3" />
                        Edit order
                    </button>
                )}
            </div>

            {/* Big total */}
            <div>
                <p className="text-[28px] font-bold text-[var(--color-text-primary)] tabular-nums tracking-tight leading-none">
                    {formatMoney(total, currency)}
                </p>
            </div>

            {/* Hero product preview */}
            {heroItem && (
                <div className="flex items-center gap-3 pb-3 border-b border-[var(--color-border)]">
                    <div className="w-12 h-12 rounded-lg bg-[var(--color-surface-secondary)] border border-[var(--color-border)] overflow-hidden flex-shrink-0 flex items-center justify-center">
                        {heroItem.product_image ? (
                            <Image
                                src={heroItem.product_image}
                                alt={heroItem.product_name}
                                width={48}
                                height={48}
                                className="w-full h-full object-cover"
                            />
                        ) : null}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-[var(--color-text-primary)] line-clamp-2 leading-snug">
                            {heroItem.product_name}
                        </p>
                        <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                            Qty: {heroItem.quantity}
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
                    className="w-full flex items-center justify-between text-[12.5px] font-medium text-blue-500 hover:text-blue-600 transition-colors"
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
                            <div className="w-9 h-9 rounded-md bg-[var(--color-surface-secondary)] border border-[var(--color-border)] overflow-hidden flex-shrink-0">
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
                    <input
                        value={promoCode}
                        onChange={(e) => onPromoChange(e.target.value)}
                        placeholder="Enter promo code (e.g. JIMVIO10)"
                        className="w-full h-10 pl-9 pr-3 rounded-sm border border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-[12.5px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]/80 focus:outline-none focus:border-[var(--color-text-muted)]"
                    />
                </div>
                <button
                    onClick={onPromoApply}
                    disabled={!promoCode.trim() || promoApplying}
                    className="h-10 px-4 rounded-sm text-[12.5px] font-semibold text-blue-500 hover:bg-blue-50 transition-colors disabled:opacity-40"
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

            <div className="flex items-baseline justify-between pt-3 border-t border-[var(--color-border)]">
                <span className="text-[14px] font-bold text-[var(--color-text-primary)]">Total</span>
                <span className="text-[18px] font-bold tabular-nums text-[var(--color-text-primary)]">
                    {formatMoney(total, currency)}
                </span>
            </div>

            {/* Buyer Protection */}
            <div className="flex items-start gap-2.5 p-3 rounded-sm bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40">
                <Shield className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="leading-tight">
                    <p className="text-[12px] font-bold text-blue-900 dark:text-blue-300">
                        Buyer Protection Guarantee
                    </p>
                    <p className="text-[11px] text-blue-800/80 dark:text-blue-400/80 mt-1">
                        Your purchase is protected. If you're not satisfied, we'll make it right.
                    </p>
                    <button className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 mt-1 hover:underline">
                        Learn more →
                    </button>
                </div>
            </div>

            {/* CTA */}
            <button
                onClick={onPay}
                disabled={paySubmitting || payDisabled}
                className={cn(
                    "w-full h-12 rounded-sm text-white text-[14px] font-bold transition-all",
                    "flex items-center justify-center gap-2",
                    "bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600",
                    "active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
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
                You won't be charged until payment is confirmed.
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
                    Trusted by 10,000+ happy customers
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