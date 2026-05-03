"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, ArrowLeft, Clock, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface SessionExpiredProps {
    /** Where to retry — defaults to current page */
    retryHref?: string;
    /** Where the back link goes — defaults to /checkout */
    backHref?: string;
    /** Called when user clicks retry (use instead of href for programmatic retry) */
    onRetry?: () => void | Promise<void>;
    /** Optional order reference to show user */
    orderRef?: string;
}

export function TransactionSessionExpired({
    retryHref,
    backHref = "/checkout",
    onRetry,
    orderRef,
}: SessionExpiredProps) {
    const [retrying, setRetrying] = useState(false);
    const [dots, setDots] = useState("");

    /* Animate the ellipsis while retrying */
    useEffect(() => {
        if (!retrying) return;
        const id = setInterval(() => setDots(d => d.length >= 3 ? "" : d + "."), 400);
        return () => clearInterval(id);
    }, [retrying]);

    async function handleRetry() {
        if (!onRetry) return;
        setRetrying(true);
        try { await onRetry(); }
        finally { setRetrying(false); }
    }

    const retryButton = onRetry ? (
        <button
            onClick={handleRetry}
            disabled={retrying}
            className={cn(
                "inline-flex items-center gap-2 h-11 px-8 rounded-xl text-sm font-semibold text-white transition-all duration-150",
                "active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
            )}
            style={{
                background: "var(--color-accent)",
                boxShadow: "0 4px 16px rgba(253,80,0,0.25)",
            }}
            onMouseEnter={e => { if (!retrying) (e.currentTarget.style.background = "var(--color-accent-hover)"); }}
            onMouseLeave={e => { if (!retrying) (e.currentTarget.style.background = "var(--color-accent)"); }}
        >
            <RefreshCw className={cn("h-4 w-4", retrying && "animate-spin")} />
            {retrying ? `Retrying${dots}` : "Try again"}
        </button>
    ) : (
        <Link
            href={retryHref ?? "#"}
            className="inline-flex items-center gap-2 h-11 px-8 rounded-xl text-sm font-semibold text-white transition-all duration-150 active:scale-[0.98]"
            style={{ background: "var(--color-accent)", boxShadow: "0 4px 16px rgba(253,80,0,0.25)" }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--color-accent-hover)")}
            onMouseLeave={e => (e.currentTarget.style.background = "var(--color-accent)")}
        >
            <RefreshCw className="h-4 w-4" />
            Try again
        </Link>
    );

    return (
        <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--color-bg)" }}>
            <div className="w-full max-w-md">

                {/* Card */}
                <div
                    className="rounded-2xl overflow-hidden"
                    style={{ border: "1px solid var(--color-border)", background: "var(--color-surface)" }}
                >
                    {/* Amber top strip */}
                    <div
                        className="h-1.5 w-full"
                        style={{ background: "linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%)" }}
                    />

                    <div className="px-8 py-10 text-center space-y-6">

                        {/* Icon */}
                        <div className="flex justify-center">
                            <div
                                className="h-16 w-16 rounded-2xl flex items-center justify-center"
                                style={{
                                    background: "rgba(245,158,11,0.10)",
                                    border: "1px solid rgba(245,158,11,0.25)",
                                }}
                            >
                                <Clock className="h-7 w-7 text-amber-500" />
                            </div>
                        </div>

                        {/* Copy */}
                        <div className="space-y-2">
                            <h1
                                className="text-xl font-bold tracking-tight"
                                style={{ color: "var(--color-text-primary)" }}
                            >
                                Session expired
                            </h1>
                            <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
                                Your payment session timed out for security reasons.
                                Your card has <strong style={{ color: "var(--color-text-primary)" }}>not been charged</strong> — you can safely start over.
                            </p>
                        </div>

                        {/* Order ref */}
                        {orderRef && (
                            <div
                                className="rounded-xl px-4 py-3 text-left"
                                style={{ background: "var(--color-surface-secondary)", border: "1px solid var(--color-border)" }}
                            >
                                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--color-text-muted)" }}>
                                    Order reference
                                </p>
                                <p className="text-sm font-mono font-medium" style={{ color: "var(--color-text-primary)" }}>
                                    {orderRef}
                                </p>
                            </div>
                        )}

                        {/* Why it happened */}
                        <div
                            className="rounded-xl px-4 py-3.5 text-left space-y-2"
                            style={{ background: "var(--color-surface-secondary)", border: "1px solid var(--color-border)" }}
                        >
                            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
                                Why this happened
                            </p>
                            {[
                                "The page was left open too long",
                                "Browser tab was inactive",
                                "Network interrupted mid-session",
                            ].map(reason => (
                                <div key={reason} className="flex items-center gap-2.5">
                                    <div
                                        className="h-1.5 w-1.5 rounded-full shrink-0"
                                        style={{ background: "var(--color-border-strong)" }}
                                    />
                                    <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{reason}</p>
                                </div>
                            ))}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-2.5 pt-1">
                            {retryButton}

                            <Link
                                href={backHref}
                                className="inline-flex items-center justify-center gap-2 h-10 px-6 rounded-xl text-sm font-semibold transition-all"
                                style={{
                                    border: "1px solid var(--color-border)",
                                    background: "transparent",
                                    color: "var(--color-text-muted)",
                                }}
                                onMouseEnter={e => { (e.currentTarget.style.color = "var(--color-text-primary)"); (e.currentTarget.style.borderColor = "var(--color-border-strong)"); }}
                                onMouseLeave={e => { (e.currentTarget.style.color = "var(--color-text-muted)"); (e.currentTarget.style.borderColor = "var(--color-border)"); }}
                            >
                                <ArrowLeft className="h-3.5 w-3.5" />
                                Back to checkout
                            </Link>
                        </div>
                    </div>

                    {/* Footer trust line */}
                    <div
                        className="px-6 py-3.5 flex items-center justify-center gap-2"
                        style={{ borderTop: "1px solid var(--color-border)", background: "var(--color-surface-secondary)" }}
                    >
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                            Your payment details were never stored. It's completely safe to retry.
                        </p>
                    </div>
                </div>

                {/* Help link below card */}
                <p className="text-center text-xs mt-5" style={{ color: "var(--color-text-muted)" }}>
                    Still having trouble?{" "}
                    <Link
                        href="/help"
                        className="font-semibold underline underline-offset-2 transition-colors"
                        style={{ color: "var(--color-accent)" }}
                    >
                        Contact support
                    </Link>
                </p>
            </div>
        </div>
    );
}