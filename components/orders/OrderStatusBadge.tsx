"use client";

import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<
  string,
  { dot: string; text: string; label: string }
> = {
  pending: {
    dot: "bg-[var(--color-text-muted)]",
    text: "text-[var(--color-text-secondary)]",
    label: "Pending",
  },
  processing: {
    dot: "bg-blue-500",
    text: "text-blue-700",
    label: "Processing",
  },
  shipped: {
    dot: "bg-[var(--color-success)]",
    text: "text-[var(--color-text-primary)]",
    label: "Shipped",
  },
  delivered: {
    dot: "bg-[var(--color-success)]",
    text: "text-[var(--color-success)]",
    label: "Delivered",
  },
  cancelled: {
    dot: "bg-[var(--color-danger)]",
    text: "text-[var(--color-danger)]",
    label: "Cancelled",
  },
  confirmed: {
    dot: "bg-blue-500",
    text: "text-blue-700",
    label: "Confirmed",
  },
  failed: {
    dot: "bg-[var(--color-danger)]",
    text: "text-[var(--color-danger)]",
    label: "Failed",
  },
  refunded: {
    dot: "bg-[var(--color-danger)]",
    text: "text-[var(--color-danger)]",
    label: "Refunded",
  },
};

export function OrderStatusBadge({
  status,
  className,
  size = "sm",
}: {
  status: string;
  className?: string;
  size?: "sm" | "md";
}) {
  const key = status?.toLowerCase() ?? "pending";
  const cfg = STATUS_STYLES[key] ?? STATUS_STYLES.pending;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-2.5 py-0.5 font-semibold",
        cfg.text,
        size === "md" && "px-3 py-1 text-sm",
        size === "sm" && "text-xs",
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-sm", cfg.dot)} />
      {cfg.label}
    </span>
  );
}

