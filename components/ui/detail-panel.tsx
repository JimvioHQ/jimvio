import React from "react";
import { cn } from "@/lib/utils";

export function DetailCard({
  title,
  icon: Icon,
  action,
  children,
  className,
}: {
  title?: string;
  icon?: React.ElementType;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)]",
        className,
      )}
    >
      {title ? (
        <div className="flex items-center justify-between border-b border-[var(--color-border)]/60 bg-[var(--color-surface-secondary)]/50 px-4 py-3">
          <div className="flex items-center gap-2">
            {Icon ? (
              <Icon className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
            ) : null}
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-muted)]">
              {title}
            </h2>
          </div>
          {action}
        </div>
      ) : null}
      {children}
    </div>
  );
}

export function DetailRow({
  label,
  value,
  mono = false,
  action,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[var(--color-border)]/60 py-2.5 last:border-0">
      <span className="shrink-0 pt-0.5 text-[11px] font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
        {label}
      </span>
      <div className="flex min-w-0 items-center gap-1.5">
        <span
          className={cn(
            "min-w-0 break-words text-right text-[12.5px] text-[var(--color-text-primary)]",
            mono && "font-mono text-[11px]",
          )}
        >
          {value}
        </span>
        {action}
      </div>
    </div>
  );
}
