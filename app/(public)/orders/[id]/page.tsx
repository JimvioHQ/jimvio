"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Package, CreditCard, Lock, Loader2, CheckCircle2,
  Clock, Truck, MapPin, ChevronRight, Receipt, ShieldCheck,
  Download, ExternalLink, AlertTriangle, RefreshCw, Bug,
  MessageSquare, Star, RotateCcw, X, Store, Sparkles,
  FileText, ChevronDown, Tag, HelpCircle, ArrowRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { TrackingCard } from "@/components/orders/TrackingCard";
import { toast } from "sonner";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useCurrency } from "@/context/CurrencyContext";
import { cn } from "@/lib/utils";
import {
  isOrderPaymentComplete,
  orderNeedsPayment,
  resolveCustomerOrderStatus,
} from "@/lib/payments/order-payment-utils";
import { sanitizeOrderTimelineNote } from "@/lib/cj/customer-errors-shared";

/* ─── Types ─────────────────────────────────────────────────────── */

type OrderError =
  | { kind: "not_found" }
  | { kind: "unauthorized" }
  | { kind: "schema"; message: string; hint?: string; details?: string }
  | { kind: "network"; message: string }
  | { kind: "unknown"; message: string; code?: string };

type OrderItem = {
  id: string;
  product_id: string | null;
  product_name: string;
  product_image: string | null;
  quantity: number;
  unit_price: number | string;
  total_price: number | string;
  product_type: string | null;
  digital_download_url: string | null;
  vendor_id: string | null;
  vendors?: {
    id: string;
    business_name: string;
    business_slug: string;
    business_logo: string | null;
  } | null;
  reviews?: { id: string }[];
};

type Transaction = {
  id: string;
  provider: string | null;
  provider_transaction_id: string | null;
  description: string | null;
  metadata: Record<string, any>;
  status: string;
  amount: number | string;
  amount_usd: number | string | null;
  created_at: string;
};

type Order = {
  id: string;
  order_number: string | null;
  buyer_id: string;
  vendor_id: string | null;
  status: string;
  payment_status: string;
  subtotal: number | string;
  discount_amount: number | string | null;
  shipping_amount: number | string | null;
  tax_amount: number | string | null;
  total_amount: number | string;
  currency: string;
  shipping_address: any;
  billing_address: any;
  notes: string | null;
  paid_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  estimated_delivery_at?: string | null;
  created_at: string;
  affiliate_id: string | null;
  integration_source: string | null;
  shopify_fulfillment_status: string | null;
  tracking_number: string | null;
  tracking_status: string | null;
  cj_fulfillment_status?: string | null;
  buyer?: { full_name: string | null; email: string | null } | null;
  order_items: OrderItem[];
  transactions: Transaction[];
  order_status_history?: Array<{
    id: string;
    previous_status: string | null;
    new_status: string;
    notes: string | null;
    created_at: string;
  }>;
};

/* ─── Helpers ───────────────────────────────────────────────────── */

function classifyError(error: any): OrderError {
  if (!error) return { kind: "unknown", message: "No error info" };
  const code = error?.code as string | undefined;
  const message = (error?.message ?? "") as string;
  const hint = error?.hint as string | undefined;
  const details = error?.details as string | undefined;
  if (code === "PGRST116") return { kind: "not_found" };
  if (code === "42501" || message.toLowerCase().includes("permission denied"))
    return { kind: "unauthorized" };
  if (
    code === "42703" || code === "42P01" || code?.startsWith("PGRST") ||
    message.toLowerCase().includes("column") ||
    message.toLowerCase().includes("relation") ||
    message.toLowerCase().includes("does not exist")
  ) return { kind: "schema", message, hint, details };
  if (message.toLowerCase().includes("failed to fetch") || message.toLowerCase().includes("networkerror"))
    return { kind: "network", message };
  return { kind: "unknown", message, code };
}

function getProviderLabel(provider: string | null | undefined) {
  if (!provider) return "Free";
  const map: Record<string, string> = {
    nowpayments: "Crypto", pesapal: "PesaPal", pawapay: "PawaPay",
    flutterwave: "Flutterwave", stripe: "Card", mtn: "MTN Money", airtel: "Airtel Money",
  };
  return map[provider.toLowerCase()] ?? provider;
}

function isPaidStatus(s: string | null | undefined): boolean {
  return isOrderPaymentComplete(s);
}

function formatDate(iso: string, opts?: Intl.DateTimeFormatOptions) {
  return new Date(iso).toLocaleDateString("en-US", opts ?? {
    month: "long", day: "numeric", year: "numeric",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(iso, { month: "short", day: "numeric" });
}

function getStepperSteps(status: string) {
  const flow = [
    { key: "pending", label: "Placed", icon: Receipt },
    { key: "processing", label: "Processing", icon: Clock },
    { key: "shipped", label: "Shipped", icon: Truck },
    { key: "delivered", label: "Delivered", icon: CheckCircle2 },
  ];
  const norm = status === "confirmed" ? "processing" : status;
  const idx = flow.findIndex(s => s.key === norm);
  return flow.map((s, i) => ({ ...s, done: i <= idx, active: i === idx }));
}

function groupItemsByVendor(items: OrderItem[]) {
  const map = new Map<string, { vendor: OrderItem["vendors"]; items: OrderItem[] }>();
  for (const item of items) {
    const key = item.vendor_id ?? "unknown";
    if (!map.has(key)) map.set(key, { vendor: item.vendors ?? null, items: [] });
    map.get(key)!.items.push(item);
  }
  return Array.from(map.values());
}

function inferDownloadable(url: string): boolean {
  try {
    const parsed = new URL(url);
    const ext = parsed.pathname.split(".").pop()?.toLowerCase() ?? "";
    return ["pdf", "zip", "rar", "exe", "dmg", "mp4", "mp3", "png", "jpg",
      "jpeg", "txt", "csv", "epub", "mobi"].includes(ext);
  } catch { return false; }
}

function countItems(order: Order): number {
  return order.order_items.reduce((acc, i) => acc + (i.quantity || 0), 0);
}

/* ─── Reusable button styles ────────────────────────────────────── */

const btnPrimary = cn(
  "inline-flex items-center justify-center gap-1.5",
  "h-11 px-6 rounded-full",
  "text-[13px] font-semibold text-white",
  "bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)]",
  "transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]",
  "active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed",
  "shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)]"
);

const btnSecondary = cn(
  "inline-flex items-center justify-center gap-1.5",
  "h-9 px-3 text-[12px] font-medium",
  "border border-[var(--color-border)] bg-[var(--color-surface)]",
  "text-[var(--color-text-secondary)]",
  "transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]",
  "hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]",
  "hover:bg-[var(--color-surface-secondary)]"
);

const btnDestructive = cn(
  "inline-flex items-center justify-center gap-1.5",
  "h-9 px-3 text-[12px] font-medium",
  "border border-[var(--color-danger)]/30 text-[var(--color-danger)]",
  "transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]",
  "hover:bg-[var(--color-danger-light)] hover:border-[var(--color-danger)]/60"
);

/* ─── Status pill ───────────────────────────────────────────────── */

function StatusPill({
  variant, icon: Icon, children,
}: {
  variant: "success" | "warning" | "danger" | "neutral" | "accent";
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  const styles: Record<string, { bg: string; fg: string }> = {
    success: { bg: "var(--color-success-light)", fg: "var(--color-success)" },
    warning: { bg: "var(--color-warning-light)", fg: "var(--color-warning)" },
    danger: { bg: "var(--color-danger-light)", fg: "var(--color-danger)" },
    accent: { bg: "var(--color-accent-light)", fg: "var(--color-accent)" },
    neutral: { bg: "var(--color-surface-secondary)", fg: "var(--color-text-secondary)" },
  };
  const s = styles[variant];
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium"
      style={{ background: s.bg, color: s.fg, borderRadius: "var(--radius-full)" }}
    >
      {Icon && <Icon className="h-3 w-3" />}
      {children}
    </span>
  );
}

/* ─── Error UI ──────────────────────────────────────────────────── */

function ErrorCard({ error, orderId, onRetry }: {
  error: OrderError; orderId: string; onRetry: () => void;
}) {
  const isDev = process.env.NODE_ENV === "development";
  const config = {
    not_found: { icon: Package, color: "var(--color-text-muted)", title: "Order not found", description: "This order doesn't exist or you don't have access to it.", showRetry: false },
    unauthorized: { icon: ShieldCheck, color: "var(--color-warning)", title: "Access denied", description: "You don't have permission to view this order.", showRetry: false },
    schema: { icon: Bug, color: "var(--color-danger)", title: "Data error", description: "There's a mismatch between the query and the database. Check your select columns.", showRetry: true },
    network: { icon: AlertTriangle, color: "var(--color-warning)", title: "Connection error", description: "Could not reach the server. Check your connection and try again.", showRetry: true },
    unknown: { icon: AlertTriangle, color: "var(--color-danger)", title: "Something went wrong", description: "An unexpected error occurred while loading this order.", showRetry: true },
  }[error.kind];
  const Icon = config.icon;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--color-bg)] px-4 py-20">
      <div className="w-full max-w-md space-y-3">
        <div
          className="flex flex-col items-center gap-4 border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center"
          style={{ borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-sm)" }}
        >
          <div
            className="flex h-14 w-14 items-center justify-center"
            style={{ background: "var(--color-surface-secondary)", color: config.color, borderRadius: "var(--radius-md)" }}
          >
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[15px] font-semibold tracking-tight text-[var(--color-text-primary)]">{config.title}</p>
            <p className="mt-1 text-[13px] text-[var(--color-text-secondary)]">{config.description}</p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row">
            {config.showRetry && (
              <button onClick={onRetry} className={cn(btnSecondary, "flex-1")}>
                <RefreshCw className="h-3.5 w-3.5" /> Retry
              </button>
            )}
            <Link href="/orders" className={cn(btnSecondary, "flex-1")}>
              <ArrowLeft className="h-3.5 w-3.5" /> Back to orders
            </Link>
          </div>
        </div>
        {isDev && (error.kind === "schema" || error.kind === "unknown") && (
          <div
            className="border border-[var(--color-danger)]/30 p-4"
            style={{ background: "var(--color-danger-light)", borderRadius: "var(--radius-md)" }}
          >
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-danger)]">
              <Bug className="h-3 w-3" /> Dev info
            </div>
            <div className="mt-2 space-y-1 font-mono text-[11px]">
              <DebugRow label="kind" value={error.kind} />
              <DebugRow label="orderId" value={orderId} />
              {"message" in error && error.message && <DebugRow label="message" value={error.message} />}
              {"code" in error && error.code && <DebugRow label="code" value={error.code} />}
              {"hint" in error && error.hint && <DebugRow label="hint" value={error.hint} />}
              {"details" in error && error.details && <DebugRow label="details" value={error.details} />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DebugRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="w-16 shrink-0 text-[var(--color-text-muted)]">{label}:</span>
      <span className="break-all text-[var(--color-danger)]">{value}</span>
    </div>
  );
}

/* ─── Skeleton ──────────────────────────────────────────────────── */

function OrderSkeleton() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="h-4 w-28 animate-pulse bg-[var(--color-surface-secondary)]" style={{ borderRadius: "var(--radius-sm)" }} />
        <div className="h-44 animate-pulse bg-[var(--color-surface-secondary)]" style={{ borderRadius: "var(--radius-lg)" }} />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="space-y-3 lg:col-span-2">
            <div className="h-32 animate-pulse bg-[var(--color-surface-secondary)]" style={{ borderRadius: "var(--radius-lg)" }} />
            <div className="h-40 animate-pulse bg-[var(--color-surface-secondary)]" style={{ borderRadius: "var(--radius-lg)" }} />
          </div>
          <div className="h-72 animate-pulse bg-[var(--color-surface-secondary)]" style={{ borderRadius: "var(--radius-lg)" }} />
        </div>
      </div>
    </div>
  );
}

/* ─── Hero summary — the visual anchor ──────────────────────────── */

function HeroSummary({
  order, providerLabel, isFreeOrder, isCancelled, isRefunded, fulfillmentStatus,
}: {
  order: Order;
  providerLabel: string;
  isFreeOrder: boolean;
  isCancelled: boolean;
  isRefunded: boolean;
  fulfillmentStatus: string;
}) {
  const { formatMoney } = useCurrency();
  const orderRef = String(order.order_number || order.id).slice(0, 12).toUpperCase();
  const itemCount = countItems(order);
  const currency = order.currency || "USD";

  // Semantic accent shifts based on state
  const accent = isCancelled ? "var(--color-danger)"
    : isRefunded ? "var(--color-warning)"
      : "var(--color-accent)";

  return (
    <section
      className="relative overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface)] animate-fade-in-up"
      style={{ borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-sm)" }}
    >
      {/* Top accent stripe — semantic state indicator (2px) */}
      <div aria-hidden className="absolute inset-x-0 top-0 h-[2px]" style={{ background: accent }} />

      <div className="grid grid-cols-1 gap-5 p-6 md:grid-cols-2 md:gap-8">
        {/* Left: Order identity */}
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
              Order
            </p>
            <h1
              className="mt-1 font-semibold tracking-tight text-[var(--color-text-primary)]"
              style={{ fontSize: "clamp(1.5rem, 4vw, 1.875rem)" }}
            >
              <span style={{ color: accent }}>#</span>{orderRef}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12px] text-[var(--color-text-secondary)]">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3 text-[var(--color-text-muted)]" />
              {formatDate(order.created_at, { month: "short", day: "numeric", year: "numeric" })}
              {" · "}{formatTime(order.created_at)}
            </span>
            <span className="text-[var(--color-text-muted)]">·</span>
            <span className="inline-flex items-center gap-1">
              <Package className="h-3 w-3 text-[var(--color-text-muted)]" />
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <OrderStatusBadge status={fulfillmentStatus} size="md" />
            {isFreeOrder && <StatusPill variant="success">Free</StatusPill>}
            {order.affiliate_id && <StatusPill variant="neutral" icon={Tag}>Affiliate</StatusPill>}
            {order.integration_source === "shopify" && <StatusPill variant="neutral">Shopify</StatusPill>}
          </div>
        </div>

        {/* Right: Total — the hero number */}
        <div className="flex flex-col items-start gap-2 border-t border-[var(--color-border)] pt-5 md:items-end md:border-l md:border-t-0 md:pl-8 md:pt-0">
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
            Total {isRefunded && "refunded"}
          </p>
          <div className="flex items-baseline gap-2">
            <span
              className="font-semibold tabular-nums tracking-tight"
              style={{
                fontSize: "clamp(1.875rem, 5vw, 2.25rem)",
                color: isFreeOrder ? "var(--color-success)" : isRefunded ? "var(--color-warning)" : "var(--color-text-primary)",
                textDecoration: isCancelled ? "line-through" : "none",
                textDecorationColor: isCancelled ? "var(--color-danger)" : undefined,
              }}
            >
              {isFreeOrder ? "Free" : formatMoney(Number(order.total_amount), currency)}
            </span>
            {!isFreeOrder && (
              <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
                {currency}
              </span>
            )}
          </div>
          <p className="text-[12px] text-[var(--color-text-secondary)]">
            {isFreeOrder ? "No payment required" : <>via <span className="font-medium text-[var(--color-text-primary)]">{providerLabel}</span></>}
          </p>
        </div>
      </div>
    </section>
  );
}

/* ─── Stepper ───────────────────────────────────────────────────── */

function StatusStepper({ status, etaIso }: { status: string; etaIso?: string | null }) {
  if (status === "cancelled" || status === "refunded") return null;
  const steps = getStepperSteps(status);
  return (
    <div className="space-y-3">
      <div className="flex w-full items-start">
        {steps.map((step, i) => {
          const Icon = step.icon;
          return (
            <React.Fragment key={step.key}>
              <div className="flex shrink-0 flex-col items-center gap-1.5">
                <div
                  className={cn(
                    "flex h-9 w-9 items-center justify-center transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
                    step.active && "scale-110"
                  )}
                  style={{
                    background: step.done ? "var(--color-accent)" : "var(--color-surface-secondary)",
                    color: step.done ? "#fff" : "var(--color-text-muted)",
                    borderRadius: "var(--radius-full)",
                    boxShadow: step.active ? "var(--shadow-glow)" : "none",
                  }}
                >
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <span className={cn(
                  "whitespace-nowrap text-[10px] font-medium uppercase tracking-wider",
                  step.done ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-muted)]"
                )}>
                  {step.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div
                  className="mx-1 mt-[18px] h-0.5 flex-1 transition-colors duration-300"
                  style={{
                    background: steps[i + 1].done ? "var(--color-accent)" : "var(--color-border)",
                    borderRadius: "var(--radius-full)",
                  }}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
      {etaIso && status !== "delivered" && (
        <p className="text-center text-[11px] text-[var(--color-text-muted)]">
          Estimated delivery <span className="font-medium text-[var(--color-text-secondary)]">
            {formatDate(etaIso, { month: "short", day: "numeric" })}
          </span>
        </p>
      )}
    </div>
  );
}

/* ─── Order item row ────────────────────────────────────────────── */

function OrderItemRow({
  item, currency, orderStatus,
}: {
  item: OrderItem;
  currency: string;
  orderStatus: string;
  orderId: string;
}) {
  const { formatMoney } = useCurrency();
  const isDigital = item.product_type === "digital";
  const hasUrl = Boolean(item.digital_download_url);
  const hasReview = (item.reviews?.length ?? 0) > 0;
  const canReview = orderStatus === "delivered" || (isDigital && orderStatus !== "cancelled");
  const isFree = Number(item.total_price) === 0;
  const downloadable = hasUrl ? inferDownloadable(item.digital_download_url!) : false;

  return (
    <li className="flex gap-3 py-3.5">
      <div
        className="relative h-16 w-16 shrink-0 overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface-secondary)]"
        style={{ borderRadius: "var(--radius-sm)" }}
      >
        {item.product_image ? (
          <img src={item.product_image} alt={item.product_name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Package className="h-5 w-5 text-[var(--color-text-muted)]" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {item.product_id ? (
              <Link
                href={`/products/${item.product_id}`}
                className="block truncate text-[13px] font-medium text-[var(--color-text-primary)] transition-colors hover:text-[var(--color-accent)]"
              >
                {item.product_name}
              </Link>
            ) : (
              <p className="truncate text-[13px] font-medium text-[var(--color-text-primary)]">
                {item.product_name}
              </p>
            )}
            <p className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">
              Qty {item.quantity}
              {Number(item.unit_price) > 0 && <> · {formatMoney(Number(item.unit_price), currency)} each</>}
            </p>
          </div>
          <span className="shrink-0 text-[13px] font-medium tabular-nums text-[var(--color-text-primary)]">
            {isFree ? <span className="text-[var(--color-success)]">Free</span> : formatMoney(Number(item.total_price), currency)}
          </span>
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-3">
          {isDigital && hasUrl && (
            <Link
              href={item.digital_download_url!}
              target="_blank"
              rel="noopener noreferrer"
              {...(downloadable && { download: true })}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--color-accent)] transition-colors hover:underline"
            >
              {downloadable ? <Download className="h-3 w-3" /> : <ExternalLink className="h-3 w-3" />}
              {downloadable ? "Download" : "Open"}
            </Link>
          )}
          {canReview && item.product_id && !hasReview && (
            <Link
              href={`/products/${item.product_id}/review?order_item=${item.id}`}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-accent)]"
            >
              <Star className="h-3 w-3" /> Leave a review
            </Link>
          )}
          {hasReview && (
            <span className="inline-flex items-center gap-1 text-[11px] text-[var(--color-text-muted)]">
              <CheckCircle2 className="h-3 w-3 text-[var(--color-success)]" /> Reviewed
            </span>
          )}
        </div>
      </div>
    </li>
  );
}

/* ─── Vendor group ──────────────────────────────────────────────── */

function VendorGroup({
  vendor, items, currency, orderStatus, orderId,
}: {
  vendor: OrderItem["vendors"];
  items: OrderItem[];
  currency: string;
  orderStatus: string;
  orderId: string;
}) {
  return (
    <div
      className="border border-[var(--color-border)] bg-[var(--color-surface)] transition-shadow duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:shadow-[var(--shadow-sm)]"
      style={{ borderRadius: "var(--radius-md)" }}
    >
      {vendor && (
        <div className="flex items-center gap-2.5 border-b border-[var(--color-border)] p-3">
          <div
            className="h-8 w-8 shrink-0 overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface-secondary)]"
            style={{ borderRadius: "var(--radius-full)" }}
          >
            {vendor.business_logo ? (
              <img src={vendor.business_logo} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Store className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
              Sold by
            </p>
            <Link
              href={`/vendors/${vendor.business_slug}`}
              className="block truncate text-[12px] font-semibold text-[var(--color-text-primary)] transition-colors hover:text-[var(--color-accent)]"
            >
              {vendor.business_name}
            </Link>
          </div>
          <Link
            href={`/messages/new?vendor=${vendor.id}&order=${orderId}`}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-[var(--color-text-secondary)] transition-all hover:text-[var(--color-accent)] hover:bg-[var(--color-accent-light)]"
            style={{ borderRadius: "var(--radius-full)" }}
          >
            <MessageSquare className="h-3 w-3" /> Message
          </Link>
        </div>
      )}

      <ul className="divide-y divide-[var(--color-border)] px-3">
        {items.map((item) => (
          <OrderItemRow key={item.id} item={item} currency={currency} orderStatus={orderStatus} orderId={orderId} />
        ))}
      </ul>
    </div>
  );
}

/* ─── Receipt-style totals (with dotted leaders) ────────────────── */

function ReceiptTotals({
  order, currency, isFreeOrder, isDigitalOrder,
}: {
  order: Order;
  currency: string;
  isFreeOrder: boolean;
  isDigitalOrder: boolean;
}) {
  const { formatMoney } = useCurrency();

  const Row = ({ label, value, emphasis = false }: {
    label: React.ReactNode;
    value: React.ReactNode;
    emphasis?: boolean;
  }) => (
    <div className={cn(
      "flex items-baseline gap-3",
      emphasis ? "text-[15px] font-semibold tracking-tight text-[var(--color-text-primary)] pt-3 mt-2 border-t border-[var(--color-border)]"
        : "text-[13px] text-[var(--color-text-secondary)]"
    )}>
      <span className="shrink-0">{label}</span>
      <span
        aria-hidden
        className="flex-1 self-end mb-[5px] border-b border-dotted opacity-50"
        style={{ borderColor: emphasis ? "var(--color-text-primary)" : "var(--color-border-strong)" }}
      />
      <span className="shrink-0 tabular-nums">{value}</span>
    </div>
  );

  return (
    <div
      className="border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
      style={{ borderRadius: "var(--radius-md)" }}
    >
      <div className="mb-3 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
        <Receipt className="h-3 w-3" /> Receipt
      </div>
      <div className="space-y-2">
        <Row
          label="Subtotal"
          value={isFreeOrder
            ? <span className="text-[var(--color-success)] font-medium">Free</span>
            : formatMoney(Number(order.subtotal ?? order.total_amount), currency)
          }
        />
        {Number(order.discount_amount ?? 0) > 0 && (
          <Row
            label="Discount"
            value={<span className="text-[var(--color-success)] font-medium">−{formatMoney(Number(order.discount_amount), currency)}</span>}
          />
        )}
        {!isDigitalOrder && (
          <Row
            label="Shipping"
            value={Number(order.shipping_amount ?? 0) === 0
              ? <span className="text-[var(--color-success)] font-medium">Free</span>
              : formatMoney(Number(order.shipping_amount), currency)
            }
          />
        )}
        {Number(order.tax_amount ?? 0) > 0 && (
          <Row label="Tax" value={formatMoney(Number(order.tax_amount), currency)} />
        )}
        <Row
          label="Total"
          value={isFreeOrder ? "Free" : formatMoney(Number(order.total_amount), currency)}
          emphasis
        />
      </div>
    </div>
  );
}

/* ─── Status timeline (collapsible) ─────────────────────────────── */

function StatusTimeline({ history }: { history: NonNullable<Order["order_status_history"]> }) {
  const [open, setOpen] = useState(false);
  if (history.length === 0) return null;
  const sorted = [...history].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div
      className="border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden"
      style={{ borderRadius: "var(--radius-md)" }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between p-3.5 text-left transition-colors hover:bg-[var(--color-surface-secondary)]"
      >
        <span className="flex items-center gap-2 text-[13px] font-medium text-[var(--color-text-primary)]">
          <Clock className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
          Order timeline
          <span className="text-[11px] font-normal text-[var(--color-text-muted)]">
            ({sorted.length} {sorted.length === 1 ? "event" : "events"})
          </span>
        </span>
        <ChevronDown className={cn("h-4 w-4 text-[var(--color-text-muted)] transition-transform duration-200", open && "rotate-180")} />
      </button>
      {open && (
        <div className="border-t border-[var(--color-border)] p-4">
          <ol className="relative space-y-4 pl-4">
            <span aria-hidden className="absolute left-1 top-1.5 bottom-1.5 w-px bg-[var(--color-border)]" />
            {sorted.map((event, i) => (
              <li key={event.id} className="relative">
                <span
                  aria-hidden
                  className="absolute -left-[11px] top-1.5 h-2 w-2"
                  style={{
                    background: i === 0 ? "var(--color-accent)" : "var(--color-text-muted)",
                    borderRadius: "var(--radius-full)",
                    boxShadow: "0 0 0 2px var(--color-surface)",
                  }}
                />
                <div className="text-[12px]">
                  <p className="font-semibold capitalize text-[var(--color-text-primary)]">
                    {event.new_status.replace(/_/g, " ")}
                  </p>
                  {(() => {
                    const note = sanitizeOrderTimelineNote(event.notes);
                    return note ? (
                      <p className="mt-0.5 text-[var(--color-text-secondary)]">{note}</p>
                    ) : null;
                  })()}
                  <p className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">
                    {formatDate(event.created_at, { month: "short", day: "numeric", year: "numeric" })}
                    {" · "}{formatTime(event.created_at)}{" · "}{relativeTime(event.created_at)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

/* ─── ACTION PANEL — adapts to order state ──────────────────────── */

function ActionPanel({
  order, isFreeOrder, isDigitalOrder, isPendingPayment, isPaid,
  isRefunded, isCancelled, providerLabel, paying, cancelling,
  onPay, onCancel, onReorder,
}: {
  order: Order;
  isFreeOrder: boolean;
  isDigitalOrder: boolean;
  isPendingPayment: boolean;
  isPaid: boolean;
  isRefunded: boolean;
  isCancelled: boolean;
  providerLabel: string;
  paying: boolean;
  cancelling: boolean;
  onPay: () => void;
  onCancel: () => void;
  onReorder: () => void;
}) {
  const { formatMoney } = useCurrency();
  const currency = order.currency || "USD";

  /* — STATE 1: Pending payment (highest urgency) — */
  if (isPendingPayment) {
    return (
      <div
        className="border border-[var(--color-warning)]/40 overflow-hidden"
        style={{
          background: "var(--color-warning-light)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-md)",
        }}
      >
        <div className="p-5">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-warning)]">
            <CreditCard className="h-3.5 w-3.5" /> Action required
          </div>
          <p className="mt-2 text-[15px] font-semibold tracking-tight text-[var(--color-text-primary)]">
            Complete your payment
          </p>
          <p className="mt-1 text-[12px] leading-relaxed text-[var(--color-text-secondary)]">
            Pay <span className="font-semibold tabular-nums text-[var(--color-text-primary)]">
              {formatMoney(Number(order.total_amount), currency)}
            </span> with <span className="font-medium text-[var(--color-text-primary)]">{providerLabel}</span> to start processing your order. Items remain reserved until payment is received.
          </p>

          <button
            onClick={onPay}
            disabled={paying}
            className={cn(
              "mt-4 flex h-12 w-full items-center justify-center gap-1.5 rounded-full px-6",
              "text-[14px] font-semibold text-white",
              "transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]",
              "active:scale-[0.97] disabled:opacity-60",
              "shadow-[var(--shadow-md)] hover:shadow-[var(--shadow-lg)]",
              !paying && "animate-pulse-glow"
            )}
            style={{ background: "var(--color-warning)" }}
          >
            {paying ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Redirecting…</>
            ) : (
              <><Lock className="h-3.5 w-3.5" /> Pay now <ArrowRight className="h-3.5 w-3.5" /></>
            )}
          </button>

          <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-[var(--color-text-muted)]">
            <ShieldCheck className="h-3 w-3" /> Secured by end-to-end encryption
          </div>
        </div>

        <button
          onClick={onCancel}
          disabled={cancelling}
          className="w-full border-t border-[var(--color-warning)]/20 bg-white/30 dark:bg-black/10 py-2.5 text-[11px] font-medium text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-danger)] disabled:opacity-60"
        >
          Cancel this order
        </button>
      </div>
    );
  }

  /* — STATE 2: Cancelled — */
  if (isCancelled) {
    return (
      <div
        className="border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
        style={{ borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-sm)" }}
      >
        <div
          className="mx-auto flex h-12 w-12 items-center justify-center"
          style={{ background: "var(--color-danger-light)", color: "var(--color-danger)", borderRadius: "var(--radius-full)" }}
        >
          <X className="h-5 w-5" />
        </div>
        <p className="mt-3 text-center text-[15px] font-semibold tracking-tight text-[var(--color-text-primary)]">
          Order cancelled
        </p>
        {order.cancelled_at && (
          <p className="mt-1 text-center text-[12px] text-[var(--color-text-secondary)]">
            on {formatDate(order.cancelled_at)}
          </p>
        )}
        <button onClick={onReorder} className={cn(btnPrimary, "mt-4 w-full")}>
          <RotateCcw className="h-3.5 w-3.5" /> Order again
        </button>
      </div>
    );
  }

  /* — STATE 3: Refunded — */
  if (isRefunded) {
    return (
      <div
        className="border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
        style={{ borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-sm)" }}
      >
        <div
          className="mx-auto flex h-12 w-12 items-center justify-center"
          style={{ background: "var(--color-warning-light)", color: "var(--color-warning)", borderRadius: "var(--radius-full)" }}
        >
          <RotateCcw className="h-5 w-5" />
        </div>
        <p className="mt-3 text-center text-[15px] font-semibold tracking-tight text-[var(--color-text-primary)]">
          Refund issued
        </p>
        <p className="mt-1 text-center text-[12px] leading-relaxed text-[var(--color-text-secondary)]">
          {formatMoney(Number(order.total_amount), currency)} returned to your original payment method.
        </p>
      </div>
    );
  }

  /* — STATE 4: Paid digital → downloads — */
  if (isPaid && isDigitalOrder) {
    return <DigitalAssetsPanel order={order} celebratory={!order.delivered_at} />;
  }

  /* — STATE 5: Paid physical with tracking — */
  if (isPaid && !isDigitalOrder && order.tracking_number) {
    return <TrackingCard order={order} />;
  }

  /* — STATE 6: Paid physical, no tracking yet — */
  if (isPaid && !isDigitalOrder) {
    return (
      <div
        className="border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
        style={{ borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-sm)" }}
      >
        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
          <Truck className="h-3 w-3" /> Shipping
        </div>
        <p className="mt-2 text-[14px] font-semibold tracking-tight text-[var(--color-text-primary)]">
          {order.status === "delivered" ? "Delivered" : "Awaiting shipment"}
        </p>
        <p className="mt-1 text-[12px] leading-relaxed text-[var(--color-text-secondary)]">
          {order.status === "delivered"
            ? "Your order arrived. Buy again or leave a review below."
            : "Tracking will appear here once your order ships. We'll email you when it does."
          }
        </p>
        {order.status === "delivered" && (
          <button onClick={onReorder} className={cn(btnPrimary, "mt-4 w-full")}>
            <RotateCcw className="h-3.5 w-3.5" /> Buy again
          </button>
        )}
      </div>
    );
  }

  return null;
}

/* ─── Digital assets panel ──────────────────────────────────────── */

function DigitalAssetsPanel({ order, celebratory = false }: {
  order: Order;
  celebratory?: boolean;
}) {
  const digitalItems = order.order_items.filter(i => i.product_type === "digital" && i.digital_download_url);

  if (digitalItems.length === 0) {
    return (
      <div
        className="border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
        style={{ borderRadius: "var(--radius-lg)" }}
      >
        <div className="flex items-center gap-2 text-[13px] font-semibold tracking-tight text-[var(--color-text-primary)]">
          <Package className="h-4 w-4 text-[var(--color-text-muted)]" />
          Order details
        </div>
        <p className="mt-2 text-[12px] text-[var(--color-text-secondary)]">
          {sanitizeOrderTimelineNote(order.notes) || "No additional details to show."}
        </p>
      </div>
    );
  }

  return (
    <div
      className="border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden"
      style={{ borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-sm)" }}
    >
      {celebratory && (
        <div
          className="flex items-center gap-2 border-b border-[var(--color-success)]/20 px-5 py-3"
          style={{ background: "var(--color-success-light)" }}
        >
          <Sparkles className="h-3.5 w-3.5 text-[var(--color-success)]" />
          <p className="text-[12px] font-medium text-[var(--color-success)]">
            Ready to download
          </p>
        </div>
      )}

      <div className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-semibold tracking-tight text-[var(--color-text-primary)]">
            Your downloads
          </p>
          <span className="text-[11px] text-[var(--color-text-muted)]">
            {digitalItems.length} {digitalItems.length === 1 ? "file" : "files"}
          </span>
        </div>

        <ul className="mt-3 space-y-2">
          {digitalItems.map((item) => {
            const downloadable = inferDownloadable(item.digital_download_url!);
            const Icon = downloadable ? Download : ExternalLink;
            return (
              <li key={item.id}>
                <Link
                  href={item.digital_download_url!}
                  target="_blank"
                  rel="noopener noreferrer"
                  {...(downloadable && { download: true })}
                  className="group flex items-center gap-2.5 border border-[var(--color-border)] p-2.5 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:border-[var(--color-accent)]/40 hover:bg-[var(--color-accent-light)] hover:shadow-[var(--shadow-sm)]"
                  style={{ borderRadius: "var(--radius-sm)" }}
                >
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center transition-transform group-hover:scale-110"
                    style={{
                      background: "var(--color-accent-light)",
                      color: "var(--color-accent)",
                      borderRadius: "var(--radius-sm)",
                    }}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-medium text-[var(--color-text-primary)]">
                      {item.product_name}
                    </p>
                    <p className="text-[10px] text-[var(--color-text-muted)]">
                      {downloadable ? "Tap to download" : "Tap to open"}
                    </p>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[var(--color-text-muted)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--color-accent)]" />
                </Link>
              </li>
            );
          })}
        </ul>

        <Link href="/dashboard/library" className={cn(btnSecondary, "mt-3 w-full")}>
          Open library <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

/* ─── Mobile sticky pay bar ─────────────────────────────────────── */

function MobilePayBar({
  paying, onPay, total, currency, providerLabel,
}: {
  paying: boolean;
  onPay: () => void;
  total: number;
  currency: string;
  providerLabel: string;
}) {
  const { formatMoney } = useCurrency();
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--color-border)] bg-[var(--color-surface)] p-3 lg:hidden"
      style={{
        boxShadow: "var(--shadow-lg)",
        paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))",
      }}
    >
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
            Total · {providerLabel}
          </p>
          <p className="text-[16px] font-semibold tabular-nums tracking-tight text-[var(--color-text-primary)]">
            {formatMoney(total, currency)}
          </p>
        </div>
        <button
          onClick={onPay}
          disabled={paying}
          className={cn(
            "inline-flex h-12 shrink-0 items-center justify-center gap-1.5 rounded-full px-6",
            "text-[13px] font-semibold text-white",
            "transition-all active:scale-[0.97] disabled:opacity-60",
            "shadow-[var(--shadow-sm)]"
          )}
          style={{ background: "var(--color-warning)" }}
        >
          {paying ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Lock className="h-3.5 w-3.5" /> Pay now</>}
        </button>
      </div>
    </div>
  );
}

/* ─── Cancel dialog ─────────────────────────────────────────────── */

function CancelDialog({
  open, onClose, onConfirm, loading,
}: {
  open: boolean; onClose: () => void; onConfirm: (reason: string) => void; loading: boolean;
}) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = original;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px] animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md border border-[var(--color-border)] bg-[var(--color-surface)] p-5 animate-scale-in"
        style={{ borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-xl)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-[15px] font-semibold tracking-tight text-[var(--color-text-primary)]">
          Cancel this order?
        </p>
        <p className="mt-1 text-[13px] leading-relaxed text-[var(--color-text-secondary)]">
          Your reservation will be released. If you've already paid, a refund will be issued within 5–10 business days.
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Optional: tell us why (helps us improve)"
          rows={3}
          className={cn(
            "mt-3 w-full resize-none border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2",
            "text-[13px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]",
            "transition-all duration-200",
            "focus:border-[var(--color-accent)] focus:outline-none focus:shadow-[var(--shadow-glow)]"
          )}
          style={{ borderRadius: "var(--radius-sm)" }}
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="inline-flex h-9 items-center px-4 text-[13px] font-medium text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
            style={{ borderRadius: "var(--radius-full)" }}
          >
            Keep order
          </button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={loading}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-full px-5",
              "text-[13px] font-semibold text-white",
              "transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]",
              "active:scale-[0.97] disabled:opacity-60",
              "shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)]"
            )}
            style={{ background: "var(--color-danger)" }}
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
            Cancel order
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main page ─────────────────────────────────────────────────── */

export default function PublicOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { formatMoney } = useCurrency();

  const [order, setOrder] = useState<Order | null>(null);
  const [orderError, setOrderError] = useState<OrderError | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const channelRef = useRef<RealtimeChannel | null>(null);

  /* ── Derived state ──────────────────────────────────────────── */

  const isFreeOrder = Number(order?.total_amount ?? 0) === 0;
  const isDigitalOrder = useMemo(() => {
    if (!order || order.order_items.length === 0) return false;
    return order.order_items.every((i) => i.product_type === "digital");
  }, [order]);
  const isPendingPayment = order
    ? orderNeedsPayment(order.payment_status, order.status, Number(order.total_amount ?? 0))
    : false;
  const isPaid = isPaidStatus(order?.payment_status) || isFreeOrder;
  const isRefunded = order?.payment_status === "refunded";
  const isCancelled = order?.status === "cancelled";
  const canCancel = order && !isCancelled && order.status === "pending" && !order.shipped_at;

  const latestTransaction = useMemo(() => {
    if (!order?.transactions?.length) return null;
    return [...order.transactions].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
  }, [order]);

  const providerLabel = isFreeOrder ? "Free" : getProviderLabel(latestTransaction?.provider);
  const paymentRef = latestTransaction?.provider_transaction_id || (latestTransaction?.metadata as any)?.reference || "—";
  const vendorGroups = useMemo(() => order ? groupItemsByVendor(order.order_items) : [], [order]);

  const fulfillmentStatus = useMemo(() => {
    if (!order) return "pending";
    return resolveCustomerOrderStatus({
      status: order.status,
      payment_status: order.payment_status,
      tracking_number: order.tracking_number,
      shipped_at: order.shipped_at,
      delivered_at: order.delivered_at,
      cj_fulfillment_status: order.cj_fulfillment_status,
      order_status_history: order.order_status_history,
    });
  }, [order]);

  const displayOrder = useMemo(() => {
    if (!order) return null;
    return { ...order, status: fulfillmentStatus };
  }, [order, fulfillmentStatus]);

  /* ── Load ───────────────────────────────────────────────────── */

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      setLoading(true);
      setOrderError(null);
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) { setOrderError({ kind: "unknown", message: authError.message }); setLoading(false); return; }
        if (!user) { router.replace(`/login?next=${encodeURIComponent(`/orders/${id}`)}`); return; }

        const { data: orderData, error } = await supabase
          .from("orders")
          .select(`
            *,
            buyer:profiles!buyer_id ( full_name, email ),
            order_items (
              id, product_id, product_name, product_image, quantity,
              unit_price, total_price, product_type, digital_download_url,
              vendor_id,
              vendors ( id, business_name, business_slug, business_logo )
            ),
            transactions (
              id, provider, provider_transaction_id,
              status, amount, amount_usd, created_at
            )
          `)
          .eq("id", id)
          .eq("buyer_id", user.id)
          .single();

        if (error) {
          const classified = classifyError(error);
          if (process.env.NODE_ENV === "development") {
            console.group(`[OrderDetail] Supabase error — ${classified.kind}`);
            console.error("Raw:", error);
            console.error("Classified:", classified);
            console.groupEnd();
          }
          setOrderError(classified); setLoading(false); return;
        }
        if (!orderData) { setOrderError({ kind: "not_found" }); setLoading(false); return; }

        const { data: historyData } = await supabase
          .from("order_status_history")
          .select("id, previous_status, new_status, notes, created_at")
          .eq("order_id", orderData.id)
          .order("created_at", { ascending: false });

        if (
          orderData.status === "pending" &&
          orderNeedsPayment(orderData.payment_status, orderData.status, Number(orderData.total_amount ?? 0))
        ) {
          fetch(`/api/orders/${id}/status`, { headers: { "Content-Type": "application/json" } })
            .catch((err) => console.error("[OrderDetail] Status sync failed:", err));
        }

        setOrder({
          ...(orderData as Order),
          order_status_history: historyData ?? [],
        });
      } catch (err: any) {
        const message = err?.message ?? "Unexpected error";
        setOrderError({ kind: message.toLowerCase().includes("fetch") ? "network" : "unknown", message });
      } finally {
        setLoading(false);
      }
    }

    void load();

    channelRef.current = supabase
      .channel(`order-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `id=eq.${id}` }, () => { void load(); })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "order_status_history", filter: `order_id=eq.${id}` }, () => { void load(); })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "transactions", filter: `order_id=eq.${id}` }, () => { void load(); })
      .subscribe();

    return () => { if (channelRef.current) void supabase.removeChannel(channelRef.current); };
  }, [id, router, retryCount]);

  /* ── Handlers ───────────────────────────────────────────────── */

  async function handlePay() {
    if (!order) return;
    setPaying(true);
    try {
      const provider = latestTransaction?.provider?.toLowerCase() || "flutterwave";
      const endpoint = provider === "pawapay" ? "/api/pawapay/checkout" : `/api/payments/${provider}/initiate`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          amount: order.total_amount,
          currency: order.currency,
          country: order.shipping_address?.countryCode || order.shipping_address?.country_code || "RW",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || `HTTP ${res.status}`);
      const url = data.redirectUrl || data.invoiceUrl || data.approvalUrl || data.redirectURL;
      if (url) window.location.href = url;
      else throw new Error("No payment link returned. Please contact support.");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setPaying(false);
    }
  }

  async function handleCancel(reason: string) {
    if (!order) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to cancel");
      toast.success("Order cancelled");
      setCancelOpen(false);
      setRetryCount((c) => c + 1);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setCancelling(false);
    }
  }

  async function handleReorder() {
    if (!order) return;
    try {
      const res = await fetch(`/api/orders/${order.id}/reorder`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reorder");
      router.push(`/checkout?cart=${data.cartId}`);
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  /* ── Render ─────────────────────────────────────────────────── */

  if (loading) return <OrderSkeleton />;
  if (orderError) return <ErrorCard error={orderError} orderId={id} onRetry={() => setRetryCount(c => c + 1)} />;
  if (!order) return <ErrorCard error={{ kind: "not_found" }} orderId={id} onRetry={() => setRetryCount(c => c + 1)} />;

  const currency = order.currency || "USD";
  const shippingAddr = order.shipping_address;

  return (
    <div className={cn(
      "min-h-screen bg-[var(--color-bg)] px-4 pt-6 sm:px-6",
      isPendingPayment ? "pb-32 lg:pb-20" : "pb-20"
    )}>
      <div className="mx-auto max-w-5xl">

        {/* Minimalist back link */}
        <Link
          href="/orders"
          className="mb-5 inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-accent)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All orders
        </Link>

        {/* HERO */}
        <HeroSummary
          order={order}
          providerLabel={providerLabel}
          isFreeOrder={isFreeOrder}
          isCancelled={isCancelled}
          isRefunded={isRefunded}
          fulfillmentStatus={fulfillmentStatus}
        />

        {/* Stepper */}
        {!isDigitalOrder && !isCancelled && !isRefunded && (
          <div
            className="mt-4 border border-[var(--color-border)] bg-[var(--color-surface)] p-5 animate-fade-in-up"
            style={{
              borderRadius: "var(--radius-lg)",
              boxShadow: "var(--shadow-sm)",
              animationDelay: "60ms",
              animationFillMode: "both",
            }}
          >
            <div className="mb-4 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
              <Truck className="h-3 w-3" /> Progress
            </div>
            <StatusStepper status={fulfillmentStatus} etaIso={order.estimated_delivery_at} />
          </div>
        )}

        {/* Detail grid */}
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">

          {/* LEFT */}
          <div
            className="space-y-4 lg:col-span-2 animate-fade-in-up"
            style={{ animationDelay: "120ms", animationFillMode: "both" }}
          >
            <section className="space-y-3">
              <div className="flex items-baseline justify-between px-1">
                <h2 className="text-[11px] font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
                  Items
                </h2>
                <span className="text-[11px] text-[var(--color-text-muted)]">
                  {order.order_items.length} {order.order_items.length === 1 ? "product" : "products"}
                  {vendorGroups.length > 1 && <> · {vendorGroups.length} sellers</>}
                </span>
              </div>
              {vendorGroups.map((group, i) => (
                <VendorGroup
                  key={group.vendor?.id ?? `group-${i}`}
                  vendor={group.vendor}
                  items={group.items}
                  currency={currency}
                  orderStatus={order.status}
                  orderId={order.id}
                />
              ))}
            </section>

            <ReceiptTotals
              order={order}
              currency={currency}
              isFreeOrder={isFreeOrder}
              isDigitalOrder={isDigitalOrder}
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div
                className="border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-shadow duration-200 hover:shadow-[var(--shadow-sm)]"
                style={{ borderRadius: "var(--radius-md)" }}
              >
                <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
                  <CreditCard className="h-3 w-3" /> Payment
                </div>
                <p className="text-[14px] font-semibold tracking-tight text-[var(--color-text-primary)]">
                  {providerLabel}
                </p>
                {!isFreeOrder && paymentRef !== "—" && (
                  <p className="mt-1 truncate font-mono text-[11px] text-[var(--color-text-muted)]">
                    {paymentRef}
                  </p>
                )}
                <div className="mt-3">
                  {isFreeOrder ? (
                    <StatusPill variant="success" icon={CheckCircle2}>No charge</StatusPill>
                  ) : isPaid ? (
                    <StatusPill variant="success" icon={CheckCircle2}>
                      Paid{order.paid_at && ` · ${formatDate(order.paid_at, { month: "short", day: "numeric" })}`}
                    </StatusPill>
                  ) : isRefunded ? (
                    <StatusPill variant="warning">Refunded</StatusPill>
                  ) : (
                    <StatusPill variant="warning">Pending</StatusPill>
                  )}
                </div>
              </div>

              {!isDigitalOrder && shippingAddr && (
                <div
                  className="border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-shadow duration-200 hover:shadow-[var(--shadow-sm)]"
                  style={{ borderRadius: "var(--radius-md)" }}
                >
                  <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
                    <MapPin className="h-3 w-3" /> Ship to
                  </div>
                  <p className="text-[14px] font-semibold tracking-tight text-[var(--color-text-primary)]">
                    {shippingAddr.name || order.buyer?.full_name}
                  </p>
                  <p className="mt-1 text-[12px] leading-relaxed text-[var(--color-text-secondary)]">
                    {[shippingAddr.line1, shippingAddr.line2, shippingAddr.city, shippingAddr.country]
                      .filter(Boolean).join(", ")}
                  </p>
                  {order.tracking_number && (
                    <p className="mt-2 font-mono text-[11px] text-[var(--color-text-muted)]">
                      Tracking: {order.tracking_number}
                    </p>
                  )}
                </div>
              )}
            </div>

            {order.order_status_history && order.order_status_history.length > 0 && (
              <StatusTimeline history={order.order_status_history} />
            )}

            {/* Tertiary actions */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              {isPaid && (
                <Link href={`/api/orders/${order.id}/invoice`} className={btnSecondary}>
                  <FileText className="h-3.5 w-3.5" /> Download invoice
                </Link>
              )}
              <Link
                href={`/help/orders?order=${order.id}`}
                className="ml-auto inline-flex h-9 items-center gap-1.5 px-3 text-[12px] font-medium text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-accent)]"
              >
                <HelpCircle className="h-3.5 w-3.5" /> Need help?
              </Link>
            </div>
          </div>

          {/* RIGHT — sticky on desktop */}
          <aside
            className="lg:col-span-1 animate-fade-in-up"
            style={{ animationDelay: "180ms", animationFillMode: "both" }}
          >
            <div className="lg:sticky lg:top-6 space-y-3">
              <ActionPanel
                order={displayOrder ?? order}
                isFreeOrder={isFreeOrder}
                isDigitalOrder={isDigitalOrder}
                isPendingPayment={isPendingPayment}
                isPaid={isPaid}
                isRefunded={isRefunded}
                isCancelled={isCancelled}
                providerLabel={providerLabel}
                paying={paying}
                cancelling={cancelling}
                onPay={handlePay}
                onCancel={() => setCancelOpen(true)}
                onReorder={handleReorder}
              />

              {(fulfillmentStatus === "delivered" && !isDigitalOrder) && (
                <button onClick={handleReorder} className={cn(btnSecondary, "w-full")}>
                  <RotateCcw className="h-3.5 w-3.5" /> Buy again
                </button>
              )}

              {canCancel && !isPendingPayment && (
                <button onClick={() => setCancelOpen(true)} className={cn(btnDestructive, "w-full")}>
                  <X className="h-3.5 w-3.5" /> Cancel order
                </button>
              )}
            </div>
          </aside>
        </div>
      </div>

      {/* Mobile sticky pay bar */}
      {isPendingPayment && (
        <MobilePayBar
          paying={paying}
          onPay={handlePay}
          total={Number(order.total_amount)}
          currency={currency}
          providerLabel={providerLabel}
        />
      )}

      <CancelDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={handleCancel}
        loading={cancelling}
      />
    </div>
  );
}