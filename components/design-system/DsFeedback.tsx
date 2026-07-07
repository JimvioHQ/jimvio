"use client";

import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

const variants = {
  default: "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)]",
  success: "border-[var(--color-success)]/30 bg-[var(--color-success-light)] text-[var(--color-success)]",
  warning: "border-[var(--color-warning)]/30 bg-[var(--color-warning-light)] text-[var(--color-warning)]",
  danger: "border-[var(--color-danger)]/30 bg-[var(--color-danger-light)] text-[var(--color-danger)]",
  info: "border-[var(--color-accent)]/30 bg-[var(--color-accent-light)] text-[var(--color-accent)]",
};

export function DsAlert({
  variant = "default",
  title,
  children,
  icon: Icon,
  className,
}: {
  variant?: keyof typeof variants;
  title?: string;
  children: React.ReactNode;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <div role="alert" className={cn("rounded-[var(--radius-md)] border px-4 py-3", variants[variant], className)}>
      <div className="flex gap-3">
        {Icon && <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />}
        <div>
          {title && <p className="text-sm font-bold">{title}</p>}
          <div className="text-sm opacity-90">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function DsSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-[var(--radius-md)] bg-[var(--color-surface-secondary)]", className)}
      aria-hidden
    />
  );
}

export function DsLoader({ label = "Loading" }: { label?: string }) {
  return (
    <div className="inline-flex items-center gap-2" role="status" aria-label={label}>
      <span className="size-5 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent" />
      <span className="text-sm text-[var(--color-text-muted)]">{label}</span>
    </div>
  );
}

export function DsProgress({ value, max = 100, className }: { value: number; max?: number; className?: string }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      className={cn("h-2 overflow-hidden rounded-full bg-[var(--color-surface-secondary)]", className)}
    >
      <div
        className="h-full rounded-full bg-[var(--color-accent)] transition-[width] duration-300"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function DsEmptyState({
  title,
  description,
  action,
  icon: Icon,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-secondary)]/50 px-6 py-12 text-center">
      {Icon && <Icon className="mb-3 size-10 text-[var(--color-text-muted)]" aria-hidden />}
      <h3 className="text-base font-bold text-[var(--color-text-primary)]">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-[var(--color-text-muted)]">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function DsErrorState({
  title = "Something went wrong",
  description,
  action,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <DsEmptyState
      title={title}
      description={description ?? "Please try again or contact support."}
      action={action}
    />
  );
}
