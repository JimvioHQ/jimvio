"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { WorkspaceEmptyArt } from "@/components/community/workspace/shared/WorkspaceActionMenu";

/**
 * Premium empty state — illustration, clear copy, modern CTA.
 */
export function ChannelEmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  emoji,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  emoji?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-1 flex-col items-center justify-center px-6 py-14 text-center sm:py-16",
        "animate-in fade-in duration-400",
        className
      )}
      role="status"
    >
      {emoji ? (
        <WorkspaceEmptyArt emoji={emoji} />
      ) : (
        <span
          className="mb-5 flex h-16 w-16 items-center justify-center rounded-[1.35rem] bg-gradient-to-br from-[var(--color-accent)]/15 via-[var(--color-surface-secondary)] to-transparent text-[var(--color-accent)] ring-1 ring-[var(--color-border)]/80"
          aria-hidden
        >
          <Icon className="h-6 w-6" />
        </span>
      )}
      <h2 className="text-[16px] font-semibold tracking-tight text-[var(--color-text-primary)]">
        {title}
      </h2>
      <p className="mt-2 max-w-sm text-[13.5px] leading-relaxed text-[var(--color-text-muted)]">
        {description}
      </p>
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className={cn(
            "mt-6 inline-flex min-h-11 items-center justify-center rounded-full px-6 text-[13px] font-semibold",
            "bg-[var(--color-accent)] text-white transition hover:opacity-90 active:scale-[0.98]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2"
          )}
        >
          {actionLabel}
        </button>
      ) : null}
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
        "inline-flex h-10 w-10 items-center justify-center rounded-full",
        "text-[var(--color-text-muted)] transition",
        "hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]",
        pressed && "bg-[var(--color-surface-secondary)] text-[var(--color-accent)]",
        className
      )}
    >
      {children}
    </button>
  );
}
