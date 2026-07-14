"use client";

import { cn } from "@/lib/utils";

export function Badge({
  children,
  variant = "neutral",
  pulse = false,
  className,
}: {
  children: React.ReactNode;
  variant?: "live" | "new" | "count" | "tier" | "role" | "neutral";
  pulse?: boolean;
  className?: string;
}) {
  const variantStyles = {
    live:
      "bg-red-500 text-white",
    new:
      "bg-[var(--color-accent)] text-white",
    count:
      "bg-[var(--color-accent)] text-white text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full min-w-4 text-center",
    tier:
      "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 text-[10.5px] font-medium px-2 py-0.5",
    role:
      "bg-[var(--color-surface-hover)] text-[var(--color-text)] border border-[var(--color-border)] text-[10px] font-mono font-semibold px-2 py-0.5 uppercase tracking-wider",
    neutral:
      "bg-[var(--color-surface)] text-[var(--color-text-secondary)] border border-[var(--color-border)] text-[11px] px-2 py-0.5",
  }[variant];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md leading-none transition-all",
        variantStyles,
        pulse && "animate-pulse",
        className
      )}
    >
      {variant === "live" && (
        <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
      )}
      {children}
    </span>
  );
}
