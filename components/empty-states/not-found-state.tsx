"use client";

import Link from "next/link";
import { ArrowLeft, Home, Search, Package, Users, LucideIcon } from "lucide-react";
import React from "react";

type Action = {
    label: string;
    href?: string;
    onClick?: () => void;
    variant?: "primary" | "ghost";
    icon?: LucideIcon;
};

type QuickLink = {
    label: string;
    href: string;
    icon?: LucideIcon;
};

type Variant = "page" | "section" | "inline";

export interface NotFoundStateProps {
    /** Layout size. `page` fills the viewport, `section` fits inside a card/container, `inline` is compact. */
    variant?: Variant;
    /** Small label above the title — e.g. "ERROR 404", "NO RESULTS", "PRODUCT MISSING". */
    eyebrow?: string;
    /** Headline. Keep it human. */
    title?: string;
    /** Supporting line. */
    description?: string;
    /** What the user typed, if this is a search empty state. Renders quoted under the title. */
    query?: string;
    /** 1–2 buttons. First is primary, second is ghost. */
    actions?: Action[];
    /** Optional helper links shown below a divider. */
    quickLinks?: QuickLink[];
    /** Hide the SVG illustration (useful for very tight spaces). */
    hideIllustration?: boolean;
    /** Override the illustration. */
    illustration?: React.ReactNode;
}

export function NotFoundState({
    variant = "page",
    eyebrow = "ERROR 404",
    title = "We can't find that page",
    description = "The link may be broken, or the page may have moved.",
    query,
    actions,
    quickLinks,
    hideIllustration = false,
    illustration,
}: NotFoundStateProps) {
    // Defaults vary by context — page-level gets the home button, others don't
    const resolvedActions: Action[] = actions ?? (
        variant === "page"
            ? [
                { label: "Back home", href: "/", icon: Home, variant: "primary" },
                { label: "Go back", onClick: () => window.history.back(), icon: ArrowLeft, variant: "ghost" },
            ]
            : []
    );

    const sizes = {
        page: { wrapper: "min-h-screen px-6 py-12", maxW: "max-w-md", svg: "max-w-[280px]", title: "text-[28px]", desc: "text-[15px]", showGrid: true, showQuickLinks: true },
        section: { wrapper: "py-16 px-6", maxW: "max-w-md", svg: "max-w-[220px]", title: "text-xl", desc: "text-sm", showGrid: false, showQuickLinks: true },
        inline: { wrapper: "py-8 px-4", maxW: "max-w-sm", svg: "max-w-[140px]", title: "text-base", desc: "text-sm", showGrid: false, showQuickLinks: false },
    }[variant];

    return (
        <div className={`relative flex items-center justify-center overflow-hidden ${sizes.wrapper}`}>
            {sizes.showGrid && <GridBackdrop />}

            <div className={`relative z-10 mx-auto flex w-full ${sizes.maxW} flex-col items-center text-center`}>
                {!hideIllustration && (
                    <div className={`mb-6 w-full ${sizes.svg}`}>
                        {illustration ?? <LostMapIllustration />}
                    </div>
                )}

                {eyebrow && (
                    <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
                        <span className="font-mono text-[11px] font-medium tracking-wider text-[var(--color-text-muted)]">
                            {eyebrow}
                        </span>
                    </div>
                )}

                <h2 className={`${sizes.title} font-bold leading-tight tracking-tight text-[var(--color-text-primary)]`}>
                    {title}
                </h2>

                {query && (
                    <p className="mt-1.5 font-mono text-sm text-[var(--color-text-muted)]">
                        &ldquo;<span className="text-[var(--color-text-primary)]">{query}</span>&rdquo;
                    </p>
                )}

                {description && (
                    <p className={`mt-2 max-w-sm leading-relaxed text-[var(--color-text-muted)] ${sizes.desc}`}>
                        {description}
                    </p>
                )}

                {resolvedActions.length > 0 && (
                    <div className="mt-6 flex w-full flex-col items-center gap-2 sm:flex-row sm:justify-center sm:gap-3">
                        {resolvedActions.map((a, i) => (
                            <ActionButton key={i} action={a} />
                        ))}
                    </div>
                )}

                {sizes.showQuickLinks && quickLinks && quickLinks.length > 0 && (
                    <div className="mt-8 w-full border-t border-[var(--color-border)] pt-5">
                        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                            Try one of these
                        </p>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                            {quickLinks.map((link) => (
                                <QuickLinkCard key={link.href} {...link} />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Subcomponents ──────────────────────────────────────────────────

function ActionButton({ action }: { action: Action }) {
    const Icon = action.icon;
    const baseClass = "inline-flex h-10 items-center justify-center gap-2 rounded-md px-5 text-sm font-medium transition-colors";
    const variantClass = action.variant === "primary"
        ? "bg-[var(--color-accent)] text-white font-semibold hover:bg-[var(--color-accent-hover)]"
        : "border border-[var(--color-border)] bg-transparent text-[var(--color-text-secondary)] hover:border-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]";

    const content = (
        <>
            {Icon && <Icon size={14} />}
            {action.label}
        </>
    );

    if (action.href) {
        return (
            <Link href={action.href} className={`${baseClass} ${variantClass} w-full sm:w-auto`}>
                {content}
            </Link>
        );
    }
    return (
        <button onClick={action.onClick} className={`${baseClass} ${variantClass} w-full sm:w-auto`}>
            {content}
        </button>
    );
}

function QuickLinkCard({ href, label, icon: Icon }: QuickLink) {
    return (
        <Link
            href={href}
            className="group flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-sm text-[var(--color-text-secondary)] transition-all hover:border-[var(--color-accent)]/40 hover:text-[var(--color-text-primary)]"
        >
            {Icon && (
                <span className="text-[var(--color-text-muted)] transition-colors group-hover:text-[var(--color-accent)]">
                    <Icon size={13} />
                </span>
            )}
            <span className="font-medium">{label}</span>
        </Link>
    );
}

function GridBackdrop() {
    return (
        <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.35]"
            style={{
                backgroundImage:
                    "linear-gradient(var(--color-border) 0.5px, transparent 0.5px), linear-gradient(90deg, var(--color-border) 0.5px, transparent 0.5px)",
                backgroundSize: "32px 32px",
                maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
                WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
            }}
        />
    );
}

// ─── Default illustration: lost on the map ──────────────────────────
function LostMapIllustration() {
    return (
        <svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg" className="w-full" aria-hidden>
            <defs>
                <linearGradient id="path-fade-default" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="1" />
                    <stop offset="70%" stopColor="var(--color-accent)" stopOpacity="0.6" />
                    <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
                </linearGradient>
            </defs>
            <path d="M 20 140 Q 60 130, 90 110 T 160 90" fill="none" stroke="var(--color-text-muted)" strokeWidth="1.5" strokeDasharray="2 5" strokeLinecap="round" opacity="0.4" />
            <path d="M 160 90 Q 200 80, 230 95 T 290 105" fill="none" stroke="url(#path-fade-default)" strokeWidth="2" strokeLinecap="round" />
            <circle cx="20" cy="140" r="4" fill="var(--color-text-muted)" opacity="0.5" />
            <circle cx="20" cy="140" r="2" fill="var(--color-surface)" />
            <g transform="translate(160 90) rotate(-12)">
                <ellipse cx="0" cy="14" rx="10" ry="2.5" fill="var(--color-text-muted)" opacity="0.2" />
                <path d="M 0 -22 C -8 -22, -12 -16, -12 -10 C -12 -2, 0 12, 0 12 C 0 12, 12 -2, 12 -10 C 12 -16, 8 -22, 0 -22 Z" fill="var(--color-accent)" />
                <circle cx="0" cy="-11" r="4" fill="var(--color-surface)" />
            </g>
            <text x="270" y="115" fontSize="24" fontWeight="800" fill="var(--color-text-muted)" opacity="0.25" fontFamily="ui-sans-serif, system-ui, sans-serif">?</text>
            <text x="6" y="195" fontSize="7" fill="var(--color-text-muted)" opacity="0.35" fontFamily="ui-monospace, monospace" letterSpacing="0.5">LAT 0.000 · LNG 0.000</text>
            <text x="252" y="195" fontSize="7" fill="var(--color-text-muted)" opacity="0.35" fontFamily="ui-monospace, monospace" letterSpacing="0.5">ERR · NO_SIGNAL</text>
        </svg>
    );
}