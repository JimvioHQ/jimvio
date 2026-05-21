// components/checkout/CheckoutTopBar.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { Lock, CheckCircle2, ChevronDown } from "lucide-react";

interface CheckoutTopBarProps {
    country: string;
    countryCode: string;
    currency: string;
    flagEmoji?: string;
    onCurrencyClick?: () => void;
}

export function CheckoutTopBar({
    country, countryCode, currency, flagEmoji = "🇷🇼", onCurrencyClick,
}: CheckoutTopBarProps) {
    return (
        <div className="sticky top-0 z-40 bg-[var(--color-bg)] border-b border-[var(--color-border)]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">

                {/* Brand */}
                <Link href="/" className="flex items-center gap-2 shrink-0">
                    <div className="w-9 h-9 rounded-lg bg-orange-500 flex items-center justify-center text-white font-bold text-lg">
                        J
                    </div>
                    <span className="text-[19px] font-bold tracking-tight text-[var(--color-text-primary)]">
                        Jim<span className="text-orange-500">vio</span>
                    </span>
                </Link>

                {/* Center pills — hide on mobile */}
                <div className="hidden md:flex items-center gap-6 flex-1 justify-center">
                    <div className="flex items-center gap-2 px-3 h-9 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]">
                        <span className="text-base leading-none">{flagEmoji}</span>
                        <span className="text-[12.5px] text-[var(--color-text-secondary)]">
                            Payment methods available in <strong className="text-[var(--color-text-primary)]">{country} ({currency})</strong>
                        </span>
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    </div>

                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                            <Lock className="h-3.5 w-3.5 text-emerald-600" />
                        </div>
                        <div className="leading-tight">
                            <p className="text-[12.5px] font-semibold text-[var(--color-text-primary)]">
                                Secure checkout
                            </p>
                            <p className="text-[10.5px] text-[var(--color-text-muted)]">
                                256-bit SSL encrypted
                            </p>
                        </div>
                    </div>
                </div>

                {/* Currency selector */}
                <button
                    onClick={onCurrencyClick}
                    className="inline-flex items-center gap-2 h-9 px-3 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-secondary)] transition-colors shrink-0"
                >
                    <span className="text-base leading-none">{flagEmoji}</span>
                    <span className="text-[12.5px] font-semibold text-[var(--color-text-primary)]">
                        {currency}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
                </button>
            </div>
        </div>
    );
}