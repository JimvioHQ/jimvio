"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Premium empty state — explain, guide, optional action.
 */
export function ChannelEmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-1 flex-col items-center justify-center px-6 py-14 text-center sm:py-16",
        "animate-in fade-in duration-200",
        className
      )}
      role="status"
    >
      <span
        className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)] ring-1 ring-[var(--color-border)]"
        aria-hidden
      >
        <Icon className="h-5 w-5" />
      </span>
      <h2 className="text-[15px] font-bold tracking-tight text-[var(--color-text-primary)]">
        {title}
      </h2>
      <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-[var(--color-text-muted)]">
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className={cn(
            "mt-5 inline-flex min-h-10 items-center justify-center rounded-lg px-4 text-[13px] font-semibold",
            "bg-[var(--color-accent)] text-white transition hover:opacity-90",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2"
          )}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

/** Shared icon control — 40px touch target + focus ring. */
export function WorkspaceIconButton({
  label,
  onClick,
  children,
  pressed,
  className,
}: {
  label: string;
  onClick?: () => void;
  children: ReactNode;
  pressed?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
        "text-[var(--color-text-muted)] transition duration-150",
        "hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-1",
        "active:scale-[0.97]",
        pressed && "text-[var(--color-accent)]",
        className
      )}
    >
      {children}
    </button>
  );
}
