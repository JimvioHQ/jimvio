"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export { cn };

/** Preferred accent — resolves to the current theme's accent token. */
export const OS_ACCENT = "var(--color-accent)";
/** Jimvio brand orange — use only for explicit brand moments (logos, hero highlights). */
export const OS_BRAND_ACCENT = "#FF5A1F";

// ─── OsCard ───────────────────────────────────────────────────────────────────

type OsCardProps = {
  children: ReactNode;
  className?: string;
  href?: string;
  padding?: "none" | "sm" | "md" | "lg";
  as?: "div" | "section";
};

const CARD_PADDING: Record<NonNullable<OsCardProps["padding"]>, string> = {
  none: "",
  sm: "p-3",
  md: "p-4 sm:p-5",
  lg: "p-5 sm:p-6",
};

/** Calm, premium surface container — 16px radius, soft border, no heavy shadows. */
export function OsCard({ children, className, href, padding = "md", as = "div" }: OsCardProps) {
  const classes = cn(
    "rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]",
    "shadow-[0_1px_2px_rgba(16,24,40,0.03)]",
    CARD_PADDING[padding],
    className,
  );

  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          classes,
          "block transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-[1px] hover:border-[var(--color-border-strong)] hover:shadow-[0_4px_16px_rgba(16,24,40,0.06)]",
        )}
      >
        {children}
      </Link>
    );
  }

  const Comp = as;
  return <Comp className={classes}>{children}</Comp>;
}

// ─── OsPill ───────────────────────────────────────────────────────────────────

type OsPillProps = {
  children: ReactNode;
  className?: string;
  active?: boolean;
  tone?: "neutral" | "accent";
  onClick?: () => void;
  href?: string;
  size?: "sm" | "md";
};

/** Compact rounded chip — used for filters, badges, and workspace labels. */
export function OsPill({
  children,
  className,
  active = false,
  tone = "neutral",
  onClick,
  href,
  size = "sm",
}: OsPillProps) {
  const classes = cn(
    "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full font-semibold transition-[background-color,color,border-color] duration-150",
    size === "sm" ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-[12px]",
    active
      ? "border border-transparent bg-[var(--color-accent)] text-white"
      : tone === "accent"
        ? "border border-[var(--color-accent)]/25 bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
        : "border border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]",
    (onClick || href) && "cursor-pointer",
    className,
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={classes}>
        {children}
      </button>
    );
  }

  return <span className={classes}>{children}</span>;
}

// ─── OsSectionTitle ───────────────────────────────────────────────────────────

type OsSectionTitleProps = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  actions?: ReactNode;
  className?: string;
};

/** Shared section heading — eyebrow + title + optional subtitle/actions. */
export function OsSectionTitle({ title, subtitle, eyebrow, actions, className }: OsSectionTitleProps) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
            {eyebrow}
          </p>
        )}
        <h2 className="text-[16px] font-semibold tracking-tight text-[var(--color-text-primary)]">{title}</h2>
        {subtitle && <p className="mt-0.5 text-[12.5px] text-[var(--color-text-muted)]">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

// ─── OsSkeleton ───────────────────────────────────────────────────────────────

/** Shimmer placeholder block — matches Creator OS surface tokens. */
export function OsSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-lg bg-[var(--color-surface-secondary)]", className)}>
      <span
        className="absolute inset-0 -translate-x-full animate-[jimvio-os-shimmer_1.6s_infinite_linear] bg-gradient-to-r from-transparent via-white/50 to-transparent dark:via-white/5"
      />
      <style>{`
        @keyframes jimvio-os-shimmer {
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
}

// ─── OsDivider ────────────────────────────────────────────────────────────────

/** Hairline row separator for quiet, composition-style sections. */
export function OsDivider({ className }: { className?: string }) {
  return <div className={cn("h-px w-full bg-[var(--color-border)]", className)} />;
}

// ─── OsIconBadge ──────────────────────────────────────────────────────────────

/** Small rounded icon chip with a tinted accent background. */
export function OsIconBadge({
  children,
  accent = OS_ACCENT,
  className,
  size = "md",
}: {
  children: ReactNode;
  accent?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const dims = size === "sm" ? "size-7" : size === "lg" ? "size-11" : "size-9";
  return (
    <span
      className={cn("grid shrink-0 place-items-center rounded-xl", dims, className)}
      style={{ background: `color-mix(in srgb, ${accent} 14%, transparent)`, color: accent }}
    >
      {children}
    </span>
  );
}
