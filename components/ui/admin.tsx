
"use client";

import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ArrowUpRight } from "lucide-react";
import { useState } from "react";

export function StatusPill({
    status, size = "sm",
}: { status: string; size?: "sm" | "md" }) {
    const map: Record<string, string> = {
        pending: "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950/30 dark:text-amber-400",
        processing: "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-950/30 dark:text-blue-400",
        completed: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/30 dark:text-emerald-400",
        paid: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/30 dark:text-emerald-400",
        confirmed: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/30 dark:text-emerald-400",
        delivered: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/30 dark:text-emerald-400",
        shipped: "bg-indigo-50 text-indigo-700 ring-indigo-600/20 dark:bg-indigo-950/30 dark:text-indigo-400",
        checkout_direct: "bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-950/30 dark:text-violet-400",
        failed: "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-950/30 dark:text-rose-400",
        refunded: "bg-slate-100 text-slate-700 ring-slate-600/20 dark:bg-slate-800 dark:text-slate-300",
        cancelled: "bg-slate-100 text-slate-700 ring-slate-600/20 dark:bg-slate-800 dark:text-slate-300",
        received: "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-950/30 dark:text-blue-400",
        resolved: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/30 dark:text-emerald-400",
        held: "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950/30 dark:text-amber-400",
        released: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/30 dark:text-emerald-400",
    };

    return (
        <span className={cn(
            "inline-flex items-center gap-1 rounded-full font-medium ring-1 ring-inset tabular-nums capitalize",
            size === "md" ? "px-2.5 py-1 text-[11.5px]" : "px-2 py-0.5 text-[10.5px]",
            map[status] ?? map.pending,
        )}>
            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
            {status.replace(/_/g, " ")}
        </span>
    );
}


const PROVIDERS: Record<string, {
    domain: string;
    label: string;
    color: string;
}> = {
    flutterwave: {
        domain: "flutterwave.com",
        label: "Flutterwave",
        color: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
    },
    pesapal: {
        domain: "pesapal.com",
        label: "Pesapal",
        color: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400",
    },
    paypal: {
        domain: "paypal.com",
        label: "PayPal",
        color: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
    },
    nowpayments: {
        domain: "nowpayments.io",
        label: "NOWPayments",
        color: "bg-violet-500/15 text-violet-700 dark:text-violet-400",
    },
    pawapay: {
        domain: "pawapay.io",
        label: "PawaPay",
        color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
    },
    irembopay: {
        domain: "irembo.com",
        label: "IremboPay",
        color: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
    },
    afripay: {
        domain: "afripay.africa",
        label: "AfriPay",
        color: "bg-pink-500/15 text-pink-700 dark:text-pink-400",
    },
    stripe: {
        domain: "stripe.com",
        label: "Stripe",
        color: "bg-purple-500/15 text-purple-700 dark:text-purple-400",
    },
    mpesa: {
        domain: "safaricom.co.ke",
        label: "M-Pesa",
        color: "bg-green-500/15 text-green-700 dark:text-green-400",
    },
};

const SIZE = {
    sm: { wrapper: "w-6 h-6", text: "text-[9px]", img: 24 },
    md: { wrapper: "w-8 h-8", text: "text-[11px]", img: 32 },
    lg: { wrapper: "w-10 h-10", text: "text-[13px]", img: 40 },
};

function getLogoUrls(domain: string) {
    return [
        `https://img.logokit.com/${domain}`,
        `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
    ];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ProviderLogo({
    provider,
    size = "md",
    showLabel = false,
}: {
    provider: string | null | undefined;
    size?: "sm" | "md" | "lg";
    showLabel?: boolean;
}) {
    const key = (provider ?? "").toLowerCase().trim();
    const config = PROVIDERS[key];
    const s = SIZE[size];

    const label = config?.label
        ?? (provider ? provider.charAt(0).toUpperCase() + provider.slice(1) : "Unknown");
    const fallbackColor = config?.color
        ?? "bg-slate-500/15 text-slate-600 dark:text-slate-400";

    const urls = config?.domain ? getLogoUrls(config.domain) : [];
    const [urlIndex, setUrlIndex] = useState(0);
    const [failed, setFailed] = useState(false);

    const currentUrl = urls[urlIndex];

    return (
        <span className="inline-flex items-center gap-2 shrink-0">
            <span className={cn(
                "inline-flex items-center justify-center rounded-lg overflow-hidden shrink-0",
                s.wrapper,
                (failed || !currentUrl) ? fallbackColor : "bg-white ring-1 ring-black/8 dark:ring-white/10",
            )}>
                {!failed && currentUrl ? (
                    <img
                        src={currentUrl}
                        alt={label}
                        width={s.img}
                        height={s.img}
                        className="w-full h-full object-contain p-0.5 rounded-[50%] select-none"
                        onError={() => {
                            if (urlIndex + 1 < urls.length) {
                                setUrlIndex(urlIndex + 1);
                            } else {
                                setFailed(true);
                            }
                        }}
                    />
                ) : (
                    <span className={cn("font-bold leading-none", s.text)}>
                        {key.slice(0, 2).toUpperCase() || "?"}
                    </span>
                )}
            </span>

            {showLabel && (
                <span className="text-[12.5px] font-medium text-[var(--color-text-primary)]">
                    {label}
                </span>
            )}
        </span>
    );
}

// ─── Range picker ─────────────────────────────────────────────────────────────

export type RangeKey = "today" | "7d" | "30d" | "mtd" | "qtd" | "ytd" | "all";

export const RANGES: Record<RangeKey, { label: string; start: () => Date | null }> = {
    today: { label: "Today", start: () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; } },
    "7d": { label: "Last 7 days", start: () => new Date(Date.now() - 7 * 86400_000) },
    "30d": { label: "Last 30 days", start: () => new Date(Date.now() - 30 * 86400_000) },
    mtd: { label: "This month", start: () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); } },
    qtd: { label: "This quarter", start: () => { const d = new Date(); return new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1); } },
    ytd: { label: "Year to date", start: () => new Date(new Date().getFullYear(), 0, 1) },
    all: { label: "All time", start: () => null },
};

export function RangePicker({ current, base }: { current: RangeKey; base: string }) {
    const items: RangeKey[] = ["today", "7d", "30d", "mtd", "qtd", "ytd"];
    return (
        <div className="inline-flex items-center gap-0.5 rounded-xl ring-[0.5px] ring-[var(--color-border)] bg-[var(--color-surface-secondary)] p-[3px]">
            {items.map((k) => (
                <Link
                    key={k}
                    href={`${base}?range=${k}`}
                    scroll={false}
                    className={cn(
                        "h-[30px] px-3 flex items-center rounded-[9px] text-[12px] font-medium transition-all duration-150 whitespace-nowrap select-none",
                        current === k
                            ? "bg-[var(--color-text-primary)] text-[var(--color-surface)] shadow-sm"
                            : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface)]",
                    )}
                >
                    {RANGES[k].label}
                </Link>
            ))}
        </div>
    );
}

// ─── Filter chip ──────────────────────────────────────────────────────────────

export function FilterChip({
    label,
    href,
    active = false,
    icon,
    count,
}: {
    label: string;
    href: string;
    active?: boolean;
    icon?: React.ElementType;
    count?: number;
}) {
    const Icon = icon;
    return (
        <Link
            href={href}
            scroll={false}
            className={cn(
                "inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-[12px] font-medium transition-all duration-150 select-none",
                active
                    ? "bg-[var(--color-text-primary)] text-[var(--color-surface)] ring-0"
                    : "bg-[var(--color-surface)] ring-[0.5px] ring-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:ring-[var(--color-border-strong)]",
            )}
        >
            {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
            {label}
            {count !== undefined && (
                <span className={cn(
                    "inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full text-[10px] font-semibold",
                    active
                        ? "bg-white/20 text-white"
                        : "bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)]",
                )}>
                    {count}
                </span>
            )}
        </Link>
    );
}

// ─── Page header ──────────────────────────────────────────────────────────────

export function PageHeader({
    eyebrow,
    title,
    subtitle,
    actions,
    border = true,
}: {
    eyebrow: string;
    title: string;
    subtitle?: string;
    actions?: React.ReactNode;
    border?: boolean;
}) {
    return (
        <div className={cn(
            "flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-4",
            border && "border-b border-[var(--color-border)]/60",
        )}>
            <div>
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)] mb-1.5">
                    {eyebrow}
                </p>
                <h1 className="text-[22px] font-medium tracking-tight text-[var(--color-text-primary)] leading-tight">
                    {title}
                </h1>
                {subtitle && (
                    <p className="text-[13px] text-[var(--color-text-muted)] mt-1 leading-relaxed">
                        {subtitle}
                    </p>
                )}
            </div>
            {actions && (
                <div className="flex items-center gap-2 flex-wrap shrink-0">
                    {actions}
                </div>
            )}
        </div>
    );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

export function EmptyState({
    icon: Icon,
    title,
    message,
    action,
}: {
    icon: React.ReactNode;
    title: string;
    message: string;
    action?: React.ReactNode;
}) {
    return (
        <div className="flex flex-col items-center justify-center py-14 px-4 border border-dashed border-[var(--color-border)] rounded-2xl">
            <div className="w-12 h-12 rounded-xl bg-[var(--color-surface-secondary)] flex items-center justify-center mb-3.5">
                {Icon}
            </div>
            <p className="text-[14px] font-medium text-[var(--color-text-primary)] mb-1.5">
                {title}
            </p>
            <p className="text-[12.5px] text-[var(--color-text-muted)] text-center max-w-[260px] leading-relaxed">
                {message}
            </p>
            {action && (
                <div className="mt-4">
                    {action}
                </div>
            )}
        </div>
    );
}
// ─── Row Link Arrow ───────────────────────────────────────────────────────────

export function RowArrow({ href }: { href: string }) {
    return (
        <Link
            href={href}
            className="text-[var(--color-text-muted)] hover:text-orange-500 transition-colors inline-block"
        >
            <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
    );
}