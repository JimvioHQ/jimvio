"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import React from "react";

export type ErrorAction = {
    label: string;
    href?: string;
    onClick?: () => void;
    variant?: "primary" | "ghost";
    icon?: LucideIcon;
};

export type ErrorVariant = "page" | "section" | "inline";

export const ERROR_SIZES = {
    page: {
        wrapper: "min-h-screen px-6 py-12",
        maxW: "max-w-md",
        svg: "max-w-[240px]",
        title: "text-[28px]",
        desc: "text-[15px]",
        showGrid: true,
    },
    section: {
        wrapper: "py-14 px-6",
        maxW: "max-w-md",
        svg: "max-w-[180px]",
        title: "text-xl",
        desc: "text-sm",
        showGrid: false,
    },
    inline: {
        wrapper: "py-10 px-4",
        maxW: "max-w-sm",
        svg: "max-w-[120px]",
        title: "text-base",
        desc: "text-[13px]",
        showGrid: false,
    },
} as const;

export function ErrorActionButton({ action }: { action: ErrorAction }) {
    const Icon = action.icon;
    const base =
        "inline-flex h-10 items-center justify-center gap-2 rounded-md px-5 text-sm font-medium transition-colors";
    const variant =
        action.variant === "primary"
            ? "bg-[var(--color-accent)] font-semibold text-white hover:bg-[var(--color-accent-hover)]"
            : "border border-[var(--color-border)] bg-transparent text-[var(--color-text-secondary)] hover:border-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]";

    const content = (
        <>
            {Icon && <Icon size={14} />}
            {action.label}
        </>
    );

    if (action.href) {
        return (
            <Link href={action.href} className={`${base} ${variant} w-full sm:w-auto`}>
                {content}
            </Link>
        );
    }

    return (
        <button type="button" onClick={action.onClick} className={`${base} ${variant} w-full sm:w-auto`}>
            {content}
        </button>
    );
}

// Same faint grid as the empty state, but the mask sits tighter and lower-opacity
// so the page reads as "something stopped" rather than "nothing here yet".
export function ErrorGridBackdrop() {
    return (
        <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.22]"
            style={{
                backgroundImage:
                    "linear-gradient(var(--color-border) 0.5px, transparent 0.5px), linear-gradient(90deg, var(--color-border) 0.5px, transparent 0.5px)",
                backgroundSize: "32px 32px",
                maskImage: "radial-gradient(ellipse at center, black 25%, transparent 65%)",
                WebkitMaskImage: "radial-gradient(ellipse at center, black 25%, transparent 65%)",
            }}
        />
    );
}

export function ErrorStateBody({
    variant,
    code,
    title,
    description,
    details,
    actions,
    hideIllustration,
    illustration,
}: {
    variant: ErrorVariant;
    /** Short machine-facing code, e.g. "500", "ECONNREFUSED", "ORDER_SYNC_FAILED" */
    code?: string;
    title: string;
    description?: string;
    /** Optional raw technical detail (stack trace, request id, payload) shown behind a toggle */
    details?: string;
    actions?: ErrorAction[];
    hideIllustration?: boolean;
    illustration?: React.ReactNode;
}) {
    const sizes = ERROR_SIZES[variant];

    return (
        <div className={`relative flex items-center justify-center overflow-hidden ${sizes.wrapper}`}>
            {sizes.showGrid && <ErrorGridBackdrop />}

            <div className={`relative z-10 mx-auto flex w-full ${sizes.maxW} flex-col items-center text-center`}>
                {!hideIllustration && illustration && (
                    <div className={`mb-5 w-full ${sizes.svg}`}>{illustration}</div>
                )}

                {code && (
                    <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-danger,#e5484d)]" />
                        <span className="font-mono text-[11px] font-medium tracking-wider text-[var(--color-text-muted)]">
                            {code}
                        </span>
                    </div>
                )}

                <h2 className={`${sizes.title} font-bold leading-tight tracking-tight text-[var(--color-text-primary)]`}>
                    {title}
                </h2>

                {description && (
                    <p className={`mt-2 max-w-sm leading-relaxed text-[var(--color-text-muted)] ${sizes.desc}`}>
                        {description}
                    </p>
                )}

                {actions && actions.length > 0 && (
                    <div className="mt-6 flex w-full flex-col items-center gap-2 sm:flex-row sm:justify-center sm:gap-3">
                        {actions.map((action, i) => (
                            <ErrorActionButton key={i} action={action} />
                        ))}
                    </div>
                )}

                {details && (
                    <details className="mt-6 w-full text-left">
                        <summary className="cursor-pointer list-none text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]">
                            Technical details
                        </summary>
                        <pre className="mt-2 max-h-40 overflow-auto rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] p-3 font-mono text-[11px] leading-relaxed text-[var(--color-text-muted)]">
                            {details}
                        </pre>
                    </details>
                )}
            </div>
        </div>
    );
}