"use client";

import Link from "next/link";
import { Headphones, ArrowLeft } from "lucide-react";
import { AnimatedPlatformStatValue } from "@/components/platform/platform-stats-provider";

export function CheckoutFooter() {
    return (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[color-mix(in_srgb,var(--color-text-primary)_10%,transparent)] bg-[color-mix(in_srgb,var(--color-bg)_95%,transparent)] text-[var(--color-text-primary)] backdrop-blur-md">
            <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 text-[12px] sm:px-6 lg:px-8">

                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-md bg-[color-mix(in_srgb,var(--color-success)_20%,transparent)] flex items-center justify-center shrink-0">
                        <svg className="h-3.5 w-3.5 text-[var(--color-success)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </svg>
                    </div>
                    <p className="text-[12px] font-medium truncate text-[var(--color-text-primary)]">
                        Trusted by <AnimatedPlatformStatValue statKey="users" /> customers worldwide
                    </p>
                    <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                        <div className="flex">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <svg key={i} className="h-3 w-3 text-amber-400 fill-current" viewBox="0 0 20 20">
                                    <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                                </svg>
                            ))}
                        </div>
                        <span className="font-bold tabular-nums text-[var(--color-text-primary)]">4.9/5</span>
                    </div>
                </div>

                <div className="flex items-center gap-2 text-[12px] shrink-0">
                    <Link
                        href="/marketplace"
                        className="inline-flex items-center gap-1.5 rounded-md bg-[var(--color-accent)] px-3 py-1.5 text-xs font-semibold text-[var(--color-bg)] transition-all hover:opacity-90 active:scale-[0.98]"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        Continue Shopping
                    </Link>
                    <Headphones className="h-3.5 w-3.5 text-[var(--color-success)]" />
                    <span className="hidden md:inline">
                        Secure <span className="text-[var(--color-text-muted)] mx-1">·</span>
                        Fast <span className="text-[var(--color-text-muted)] mx-1">·</span>
                        Reliable <span className="text-[var(--color-text-muted)] mx-1">·</span>
                        24/7 Support
                    </span>
                    <span className="md:hidden">24/7 Support</span>
                    <span className="w-2 h-2 rounded-full bg-[var(--color-success)] animate-pulse ml-1" />
                </div>
            </div>
        </div>
    );
}