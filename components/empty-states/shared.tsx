"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import React from "react";

export type EmptyAction = {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "ghost";
  icon?: LucideIcon;
};

export type EmptyQuickLink = {
  label: string;
  href: string;
  icon?: LucideIcon;
};

export type EmptyVariant = "page" | "section" | "inline";

export const EMPTY_SIZES = {
  page: {
    wrapper: "min-h-screen px-6 py-12",
    maxW: "max-w-md",
    svg: "max-w-[280px]",
    title: "text-[28px]",
    desc: "text-[15px]",
    showGrid: true,
    showQuickLinks: true,
  },
  section: {
    wrapper: "py-14 px-6",
    maxW: "max-w-md",
    svg: "max-w-[200px]",
    title: "text-xl",
    desc: "text-sm",
    showGrid: false,
    showQuickLinks: false,
  },
  inline: {
    wrapper: "py-10 px-4",
    maxW: "max-w-sm",
    svg: "max-w-[140px]",
    title: "text-base",
    desc: "text-[13px]",
    showGrid: false,
    showQuickLinks: false,
  },
} as const;

export function EmptyActionButton({ action }: { action: EmptyAction }) {
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

export function EmptyQuickLinkCard({ href, label, icon: Icon }: EmptyQuickLink) {
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

export function EmptyGridBackdrop() {
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

export function EmptyStateBody({
  variant,
  eyebrow,
  title,
  description,
  query,
  actions,
  quickLinks,
  hideIllustration,
  illustration,
}: {
  variant: EmptyVariant;
  eyebrow?: string;
  title: string;
  description?: string;
  query?: string;
  actions?: EmptyAction[];
  quickLinks?: EmptyQuickLink[];
  hideIllustration?: boolean;
  illustration?: React.ReactNode;
}) {
  const sizes = EMPTY_SIZES[variant];

  return (
    <div className={`relative flex items-center justify-center overflow-hidden ${sizes.wrapper}`}>
      {sizes.showGrid && <EmptyGridBackdrop />}

      <div className={`relative z-10 mx-auto flex w-full ${sizes.maxW} flex-col items-center text-center`}>
        {!hideIllustration && illustration && (
          <div className={`mb-5 w-full ${sizes.svg}`}>{illustration}</div>
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

        {actions && actions.length > 0 && (
          <div className="mt-6 flex w-full flex-col items-center gap-2 sm:flex-row sm:justify-center sm:gap-3">
            {actions.map((action, i) => (
              <EmptyActionButton key={i} action={action} />
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
                <EmptyQuickLinkCard key={link.href} {...link} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
