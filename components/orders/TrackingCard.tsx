"use client";

import { Check, Package, CreditCard, Settings, Truck, Home, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr?: string | null) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return {
    date: d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    time: d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
  };
}

function buildSteps(order: TrackingOrder) {
  const isProcessing = ["processing", "confirmed", "shipped", "delivered"].includes(order.status);
  const isShipped = Boolean(order.shipped_at) || ["shipped", "delivered"].includes(order.status);
  const isDelivered = Boolean(order.delivered_at) || order.status === "delivered";

  return [
    {
      key: "placed",
      label: "Order Placed",
      sublabel: "We've received your order",
      icon: Package,
      done: true,
      active: !order.paid_at,
      date: order.created_at,
    },
    {
      key: "paid",
      label: "Payment Confirmed",
      sublabel: "Payment successfully processed",
      icon: CreditCard,
      done: Boolean(order.paid_at),
      active: Boolean(order.paid_at) && !isProcessing,
      date: order.paid_at,
    },
    {
      key: "processing",
      label: "Processing",
      sublabel: "Your items are being prepared",
      icon: Settings,
      done: isProcessing,
      active: isProcessing && !isShipped,
      date: isProcessing ? order.paid_at ?? order.created_at : null,
    },
    {
      key: "shipped",
      label: "Shipped",
      sublabel: "Your order is on the way",
      icon: Truck,
      done: isShipped,
      active: isShipped && !isDelivered,
      date: order.shipped_at,
    },
    {
      key: "delivered",
      label: "Delivered",
      sublabel: "Package received",
      icon: Home,
      done: isDelivered,
      active: isDelivered,
      date: order.delivered_at,
    },
  ];
}

function TrackingStep({
  label,
  sublabel,
  date,
  active,
  done,
  isLast,
  icon: Icon,
}: {
  label: string;
  sublabel: string;
  date?: string | null;
  active: boolean;
  done: boolean;
  isLast: boolean;
  icon: React.ElementType;
}) {
  const formatted = formatDate(date);

  return (
    <div className="flex gap-3.5">
      {/* Icon + connector */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all duration-300",
            done && "bg-[var(--color-accent)] text-white shadow-md shadow-[var(--color-accent)]/25",
            active && !done && "bg-[var(--color-accent-light)] text-[var(--color-accent)] ring-4 ring-[var(--color-accent)]/15",
            !done && !active && "bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)]"
          )}
        >
          {done ? (
            <Check className="h-3.5 w-3.5 stroke-[2.5]" />
          ) : (
            <Icon className="h-3.5 w-3.5" />
          )}
          {/* Pulse on active step */}
          {active && !done && (
            <span className="absolute inset-0 rounded-lg animate-ping bg-[var(--color-accent)]/20" />
          )}
        </div>

        {!isLast && (
          <div
            className={cn(
              "mt-1 w-px flex-1 min-h-[20px] rounded-full transition-colors duration-500",
              done ? "bg-[var(--color-accent)]/30" : "bg-[var(--color-border)]"
            )}
          />
        )}
      </div>

      {/* Content */}
      <div className={cn("pb-5 flex-1 min-w-0", isLast && "pb-0")}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p
              className={cn(
                "text-sm font-semibold leading-tight",
                done || active
                  ? "text-[var(--color-text-primary)]"
                  : "text-[var(--color-text-muted)]"
              )}
            >
              {label}
            </p>
            <p
              className={cn(
                "text-xs mt-0.5",
                done || active
                  ? "text-[var(--color-text-secondary)]"
                  : "text-[var(--color-text-muted)]"
              )}
            >
              {sublabel}
            </p>
          </div>

          {formatted && (
            <div className="text-right shrink-0">
              <p className="text-[11px] font-medium text-[var(--color-text-secondary)]">
                {formatted.date}
              </p>
              <p className="text-[11px] text-[var(--color-text-muted)]">
                {formatted.time}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Tracking number banner ───────────────────────────────────────────────────

function TrackingBanner({
  trackingNumber,
  trackingStatus,
}: {
  trackingNumber: string;
  trackingStatus?: string | null;
}) {
  const handleCopy = () => {
    navigator.clipboard.writeText(trackingNumber).then(() => {
      toast.success("Tracking number copied");
    });
  };

  return (
    <div className="mb-5 rounded-xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)] overflow-hidden">
      <div className="px-4 py-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] mb-1">
            Tracking Number
          </p>
          <p className="text-sm font-mono font-semibold text-[var(--color-text-primary)] truncate">
            {trackingNumber}
          </p>
        </div>
        <button
          onClick={handleCopy}
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
            bg-[var(--color-surface)] border border-[var(--color-border)]
            text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]
            hover:border-[var(--color-accent)] transition-colors"
        >
          <Copy className="h-3 w-3" />
          Copy
        </button>
      </div>
      {trackingStatus && (
        <div className="px-4 py-2 border-t border-[var(--color-border)] bg-[var(--color-surface-secondary)]/50">
          <p className="text-xs text-[var(--color-text-secondary)]">
            Status:{" "}
            <span className="font-semibold text-[var(--color-text-primary)]">
              {trackingStatus}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Preparing notice ─────────────────────────────────────────────────────────

function PreparingNotice() {
  return (
    <div className="mb-5 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl
      bg-[var(--color-surface-secondary)] border border-[var(--color-border)]">
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-accent)] opacity-50" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--color-accent)]" />
      </span>
      <p className="text-xs font-medium text-[var(--color-text-secondary)]">
        Your order is being prepared
      </p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function TrackingCard({ order }: { order: TrackingOrder }) {
  const steps = buildSteps(order);
  const hasTracking = Boolean(order.tracking_number);

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-sm)] sticky">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-bold text-[var(--color-text-primary)] uppercase tracking-widest">
          Tracking
        </h3>
        {order.status === "delivered" && (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
            <Check className="h-3 w-3 stroke-[2.5]" /> Complete
          </span>
        )}
      </div>

      {hasTracking ? (
        <TrackingBanner
          trackingNumber={order.tracking_number!}
          trackingStatus={order.tracking_status}
        />
      ) : (
        <PreparingNotice />
      )}

      <div>
        {steps.map((step, i) => (
          <TrackingStep
            key={step.key}
            label={step.label}
            sublabel={step.sublabel}
            date={step.date}
            active={step.active}
            done={step.done}
            isLast={i === steps.length - 1}
            icon={step.icon}
          />
        ))}
      </div>
    </div>
  );
}