"use client";

import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

export type TrackingOrder = {
  status: string;
  payment_status?: string | null;
  paid_at?: string | null;
  shipped_at?: string | null;
  delivered_at?: string | null;
  tracking_number?: string | null;
  tracking_status?: string | null;
  created_at: string;
};

function Step({
  label,
  date,
  active,
  done,
}: {
  label: string;
  date?: string | null;
  active: boolean;
  done: boolean;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs",
            done && "border-[var(--color-success)] bg-[var(--color-success-light)] text-[var(--color-success)]",
            active && !done && "border-[var(--color-accent)] bg-[var(--color-accent-light)] text-[var(--color-accent)] shadow-[0_0_12px_rgba(249,115,22,0.35)]",
            !done && !active && "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)]"
          )}
        >
          {done ? <Check className="h-4 w-4" /> : <Circle className="h-3 w-3 fill-current" />}
        </div>
        <div className="w-px flex-1 min-h-[12px] bg-[var(--color-border)] last:hidden" />
      </div>
      <div className="pb-4">
        <p className={cn("text-sm font-semibold", active ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-secondary)]")}>
          {label}
        </p>
        {date && (
          <p className="text-xs text-[var(--color-text-muted)]">
            {new Date(date).toLocaleString()}
          </p>
        )}
      </div>
    </div>
  );
}

export function TrackingCard({ order }: { order: TrackingOrder }) {
  const placed = order.created_at;
  const paid = order.paid_at;
  const processing = ["processing", "confirmed", "shipped", "delivered"].includes(order.status);
  const shipped = order.shipped_at;
  const delivered = order.delivered_at;

  const hasTracking = Boolean(order.tracking_number);

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-sm)]">
      <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-4">Order Tracking</h3>

      {!hasTracking && (
        <div className="mb-6 flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-accent)] opacity-40" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--color-accent)]" />
          </span>
          Your order is being prepared
        </div>
      )}

      {hasTracking && (
        <div className="mb-6 space-y-2 rounded-xl bg-[var(--color-surface-secondary)] p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Tracking number</p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="rounded-lg bg-[var(--color-surface)] px-2 py-1 text-sm font-mono">{order.tracking_number}</code>
            {order.tracking_status && (
              <span className="text-xs text-[var(--color-text-secondary)]">{order.tracking_status}</span>
            )}
          </div>
        </div>
      )}

      <div className="space-y-0">
        <Step label="Order placed" date={placed} active done />
        <Step label="Payment confirmed" date={paid} active={Boolean(paid)} done={Boolean(paid)} />
        <Step label="Processing" date={processing ? order.created_at : null} active={processing && !shipped} done={processing} />
        <Step label="Shipped" date={shipped} active={Boolean(shipped)} done={Boolean(shipped)} />
        <Step label="Delivered" date={delivered} active={Boolean(delivered)} done={Boolean(delivered)} />
      </div>
    </div>
  );
}
