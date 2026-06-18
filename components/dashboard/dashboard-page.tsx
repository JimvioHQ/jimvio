import React from "react";
import { cn } from "@/lib/utils";

/** Consistent outer spacing for all dashboard pages (pairs with admin PageHeader / Tile). */
export function DashboardPage({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("space-y-6", className)}>{children}</div>;
}

/** Admin-style bordered panel used for tables, lists, and detail blocks. */
export function DashboardPanel({
  children,
  className,
  padding = true,
}: {
  children: React.ReactNode;
  className?: string;
  padding?: boolean;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]",
        padding && "p-4 sm:p-5",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Standard admin action button (matches orders/products pages). */
export function DashboardAction({
  children,
  className,
  variant = "secondary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
}) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-lg px-3.5 text-[12.5px] font-medium transition-colors disabled:opacity-50",
        variant === "primary"
          ? "bg-[var(--color-accent)] text-white hover:bg-orange-500"
          : "bg-[var(--color-surface)] text-[var(--color-text-muted)] ring-1 ring-[var(--color-border)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function DashboardActionLink({
  children,
  className,
  variant = "secondary",
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  variant?: "primary" | "secondary";
}) {
  return (
    <a
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-lg px-3.5 text-[12.5px] font-medium transition-colors",
        variant === "primary"
          ? "bg-[var(--color-accent)] text-white hover:bg-orange-500"
          : "bg-[var(--color-surface)] text-[var(--color-text-muted)] ring-1 ring-[var(--color-border)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]",
        className,
      )}
      {...props}
    >
      {children}
    </a>
  );
}
