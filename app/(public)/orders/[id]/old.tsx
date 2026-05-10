
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Package, CreditCard, Lock, Loader2, CheckCircle2,
  Clock, Truck, MapPin, ChevronRight, Receipt, ShieldCheck,
  Download, ExternalLink, AlertTriangle, RefreshCw, Bug,
  MessageSquare, Star, RotateCcw, X, Store, Calendar,
  FileText, ChevronDown, Send, Tag,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { TrackingCard } from "@/components/orders/TrackingCard";
import { toast } from "sonner";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useCurrency } from "@/context/CurrencyContext";
import { cn } from "@/lib/utils";

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
  created_at: string;
  affiliate_id: string | null;
  integration_source: string | null;
  shopify_fulfillment_status: string | null;
  tracking_number: string | null;
  tracking_status: string | null;
  buyer?: { full_name: string | null; email: string | null } | null;
  order_items: OrderItem[];
  transactions: Transaction[];
  order_status_history: Array<{
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
  return s === "paid" || s === "completed";
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

const ORDER_FLOW = ["pending", "confirmed", "processing", "shipped", "delivered"] as const;

function getStepperSteps(status: string) {
  const flow = [
    { key: "pending", label: "Placed", icon: Receipt },
    { key: "processing", label: "Processing", icon: Clock },
    { key: "shipped", label: "Shipped", icon: Truck },
    { key: "delivered", label: "Delivered", icon: CheckCircle2 },
  ];
  // Map confirmed → processing for visual purposes
  const norm = status === "confirmed" ? "processing" : status;
  const idx = flow.findIndex(s => s.key === norm);
  return flow.map((s, i) => ({ ...s, done: i <= idx, active: i === idx }));
}

function groupItemsByVendor(items: OrderItem[]) {
  const map = new Map<string, { vendor: OrderItem["vendors"]; items: OrderItem[] }>();
  for (const item of items) {
    const key = item.vendor_id ?? "unknown";
    if (!map.has(key)) {
      map.set(key, { vendor: item.vendors ?? null, items: [] });
    }
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
  } catch {
    return false;
  }
}

/* ─── Error UI ──────────────────────────────────────────────────── */

function ErrorCard({
  error, orderId, onRetry,
}: {
  error: OrderError;
  orderId: string;
  onRetry: () => void;
}) {
  const isDev = process.env.NODE_ENV === "development";

  const config = {
    not_found: {
      icon: Package, color: "var(--color-text-muted)",
      title: "Order not found",
      description: "This order doesn't exist or you don't have access to it.",
      showRetry: false,
    },
    unauthorized: {
      icon: ShieldCheck, color: "var(--color-warning)",
      title: "Access denied",
      description: "You don't have permission to view this order.",
      showRetry: false,
    },
    schema: {
      icon: Bug, color: "var(--color-danger)",
      title: "Data error",
      description: "There's a mismatch between the query and the database. Check your select columns.",
      showRetry: true,
    },
    network: {
      icon: AlertTriangle, color: "var(--color-warning)",
      title: "Connection error",
      description: "Could not reach the server. Check your connection and try again.",
      showRetry: true,
    },
    unknown: {
      icon: AlertTriangle, color: "var(--color-danger)",
      title: "Something went wrong",
      description: "An unexpected error occurred while loading this order.",
      showRetry: true,
    },
  }[error.kind];

  const Icon = config.icon;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--color-bg)] px-4 py-20">
      <div className="w-full max-w-md space-y-3">
        <div
          className="flex flex-col items-center gap-4 border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center"
          style={{ borderRadius: "var(--radius-lg)" }}
        >
          <div
            className="flex h-12 w-12 items-center justify-center"
            style={{
              background: "var(--color-surface-secondary)",
              color: config.color,
              borderRadius: "var(--radius-md)",
            }}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[15px] font-semibold text-[var(--color-text-primary)]">
              {config.title}
            </p>
            <p className="mt-1 text-[13px] text-[var(--color-text-secondary)]">
              {config.description}
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row">
            {config.showRetry && (
              <button
                onClick={onRetry}
                className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 border border-[var(--color-border)] bg-[var(--color-surface)] text-[13px] font-medium text-[var(--color-text-secondary)] hover:border-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                style={{ borderRadius: "var(--radius-sm)" }}
              >
                <RefreshCw className="h-3.5 w-3.5" /> Retry
              </button>
            )}
            <Link
              href="/orders"
              className="inline-flex h-9  flex-1 items-center justify-center gap-1.5 border border-[var(--color-border)] text-[13px] font-medium text-[var(--color-text-secondary)] hover:border-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
              style={{ borderRadius: "var(--radius-sm)" }}
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to orders
            </Link>
          </div>
        </div>

        {isDev && (error.kind === "schema" || error.kind === "unknown") && (
          <div
            className="border border-[var(--color-danger)]/30 bg-[var(--color-danger-light)] p-4"
            style={{ borderRadius: "var(--radius-md)" }}
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
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="space-y-3 lg:col-span-2">
            <div className="h-48 animate-pulse bg-[var(--color-surface-secondary)]" style={{ borderRadius: "var(--radius-lg)" }} />
            <div className="h-40 animate-pulse bg-[var(--color-surface-secondary)]" style={{ borderRadius: "var(--radius-lg)" }} />
          </div>
          <div className="h-72 animate-pulse bg-[var(--color-surface-secondary)]" style={{ borderRadius: "var(--radius-lg)" }} />
        </div>
      </div>
    </div>
  );
}

/* ─── Stepper ───────────────────────────────────────────────────── */

function StatusStepper({ status }: { status: string }) {
  if (status === "cancelled" || status === "refunded") return null;
  const steps = getStepperSteps(status);
  return (
    <div className="flex w-full items-start">
      {steps.map((step, i) => {
        const Icon = step.icon;
        return (
          <React.Fragment key={step.key}>
            <div className="flex shrink-0 flex-col items-center gap-1.5">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center transition-all",
                  step.active && "ring-2 ring-offset-2 ring-offset-[var(--color-surface)]"
                )}
                style={{
                  background: step.done ? "var(--color-accent)" : "var(--color-surface-secondary)",
                  color: step.done ? "#fff" : "var(--color-text-muted)",
                  borderRadius: "var(--radius-full)",
                  ...(step.active && { boxShadow: "0 0 0 2px var(--color-accent)" }),
                }}
              >
                <Icon className="h-3.5 w-3.5" />
              </div>
              <span
                className={cn(
                  "whitespace-nowrap text-[10px] font-medium uppercase tracking-wider",
                  step.done ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-muted)]"
                )}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className="mx-1 mb-4 h-0.5 flex-1 transition-colors"
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
  );
}

/* ─── Item card (within a vendor group) ─────────────────────────── */

function OrderItemRow({
  item, currency, orderStatus, orderId,
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
    <li className="flex gap-3 py-3">
      <div
        className="relative h-14 w-14 shrink-0 overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface-secondary)]"
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
                className="block truncate text-[13px] font-medium text-[var(--color-text-primary)] hover:text-[var(--color-accent)]"
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
              {Number(item.unit_price) > 0 && (
                <> · {formatMoney(Number(item.unit_price), currency)} each</>
              )}
            </p>
          </div>
          <span className="shrink-0 text-[13px] font-medium tabular-nums text-[var(--color-text-primary)]">
            {isFree ? (
              <span className="text-[var(--color-success)]">Free</span>
            ) : (
              formatMoney(Number(item.total_price), currency)
            )}
          </span>
        </div>

        {/* Item actions */}
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          {isDigital && hasUrl && (
            <Link
              href={item.digital_download_url!}
              target="_blank"
              rel="noopener noreferrer"
              {...(downloadable && { download: true })}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--color-accent)] hover:underline"
            >
              {downloadable ? <Download className="h-3 w-3" /> : <ExternalLink className="h-3 w-3" />}
              {downloadable ? "Download" : "Open"}
            </Link>
          )}
          {canReview && item.product_id && !hasReview && (
            <Link
              href={`/products/${item.product_id}/review?order_item=${item.id}`}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-accent)]"
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
  vendor, items, currency, orderStatus, orderId, slug,
}: {
  vendor: OrderItem["vendors"];
  items: OrderItem[];
  currency: string;
  orderStatus: string;
  orderId: string;
  slug?: string;
}) {
  return (
    <div
      className="border border-[var(--color-border)] bg-[var(--color-surface)]"
      style={{ borderRadius: "var(--radius-md)" }}
    >
      {/* Vendor header */}
      {vendor && (
        <div className="flex items-center gap-2.5 border-b border-[var(--color-border)] p-3">
          <div
            className="h-7 w-7 shrink-0 overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface-secondary)]"
            style={{ borderRadius: "var(--radius-sm)" }}
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
            <p className="truncate text-[12px] font-medium text-[var(--color-text-primary)]">
              Sold by{" "}
              <Link
                href={`/vendors/${vendor.business_slug}`}
                className="hover:text-[var(--color-accent)]"
              >
                {vendor.business_name}
              </Link>
            </p>
          </div>
          <Link
            href={`/messages/new?vendor=${vendor.id}&order=${orderId}`}
            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-accent)]"
            style={{ borderRadius: "var(--radius-sm)" }}
          >
            <MessageSquare className="h-3 w-3" /> Message
          </Link>
        </div>
      )}

      <ul className="divide-y divide-[var(--color-border)] px-3">
        {items.map((item) => (
          <OrderItemRow
            key={item.id}
            item={item}
            currency={currency}
            orderStatus={orderStatus}
            orderId={orderId}
          />
        ))}
      </ul>
    </div>
  );
}

/* ─── Status timeline (collapsible) ─────────────────────────────── */

function StatusTimeline({ history }: { history: Order["order_status_history"] }) {
  const [open, setOpen] = useState(false);
  if (history.length === 0) return null;

  const sorted = [...history].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div
      className="border border-[var(--color-border)] bg-[var(--color-surface)]"
      style={{ borderRadius: "var(--radius-md)" }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between p-3 text-left"
      >
        <span className="flex items-center gap-2 text-[13px] font-medium text-[var(--color-text-primary)]">
          <Clock className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
          Order timeline
          <span className="text-[11px] font-normal text-[var(--color-text-muted)]">
            ({sorted.length} {sorted.length === 1 ? "event" : "events"})
          </span>
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-[var(--color-text-muted)] transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div className="border-t border-[var(--color-border)] p-3">
          <ol className="relative space-y-3 pl-4">
            <span
              aria-hidden
              className="absolute left-1 top-1.5 bottom-1.5 w-px bg-[var(--color-border)]"
            />
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
                  <p className="font-medium capitalize text-[var(--color-text-primary)]">
                    {event.new_status.replace(/_/g, " ")}
                  </p>
                  {event.notes && (
                    <p className="mt-0.5 text-[var(--color-text-secondary)]">{event.notes}</p>
                  )}
                  <p className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">
                    {formatDate(event.created_at, { month: "short", day: "numeric", year: "numeric" })}
                    {" · "}
                    {formatTime(event.created_at)}
                    {" · "}
                    {relativeTime(event.created_at)}
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

/* ─── Payment banner (pending) ──────────────────────────────────── */

function PaymentBanner({
  paying, onPay, providerLabel,
}: {
  paying: boolean;
  onPay: () => void;
  providerLabel: string;
}) {
  return (
    <div
      className="mt-5 overflow-hidden border border-[var(--color-warning)]/30"
      style={{
        background: "var(--color-warning-light)",
        borderRadius: "var(--radius-md)",
      }}
    >
      <div className="flex flex-col items-start justify-between gap-3 p-4 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center"
            style={{
              background: "var(--color-warning)",
              color: "#fff",
              borderRadius: "var(--radius-sm)",
            }}
          >
            <CreditCard className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[13px] font-medium text-[var(--color-text-primary)]">
              Awaiting payment
            </p>
            <p className="mt-0.5 text-[12px] text-[var(--color-text-secondary)]">
              Complete payment with {providerLabel} to begin processing. Items are reserved.
            </p>
          </div>
        </div>
        <button
          onClick={onPay}
          disabled={paying}
          className="inline-flex h-9 w-full shrink-0 items-center justify-center gap-1.5 px-4 text-[13px] font-medium text-white transition-colors disabled:opacity-60 sm:w-auto"
          style={{
            background: "var(--color-warning)",
            borderRadius: "var(--radius-sm)",
          }}
        >
          {paying ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Redirecting…
            </>
          ) : (
            <>
              <Lock className="h-3 w-3" /> Pay now
            </>
          )}
        </button>
      </div>
      <div className="flex items-center gap-1.5 border-t border-[var(--color-warning)]/20 px-4 py-2 text-[11px] text-[var(--color-text-secondary)]">
        <ShieldCheck className="h-3 w-3" />
        Secured by end-to-end encryption
      </div>
    </div>
  );
}

/* ─── Cancel dialog ─────────────────────────────────────────────── */

function CancelDialog({
  open, onClose, onConfirm, loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  loading: boolean;
}) {
  const [reason, setReason] = useState("");
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className="w-full max-w-md border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
        style={{ borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-lg)" }}
      >
        <p className="text-[15px] font-semibold text-[var(--color-text-primary)]">
          Cancel this order?
        </p>
        <p className="mt-1 text-[13px] text-[var(--color-text-secondary)]">
          Your reservation will be released. If you've already paid, a refund will be issued within 5–10 business days.
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Optional: tell us why (helps us improve)"
          rows={3}
          className="mt-3 w-full resize-none border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-[13px] text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none"
          style={{ borderRadius: "var(--radius-sm)" }}
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="inline-flex h-9 items-center px-3 text-[13px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          >
            Keep order
          </button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={loading}
            className="inline-flex h-9 items-center gap-1.5 px-4 text-[13px] font-medium text-white disabled:opacity-60"
            style={{
              background: "var(--color-danger)",
              borderRadius: "var(--radius-sm)",
            }}
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
  const isPendingPayment = order?.payment_status === "pending" && !isFreeOrder;
  const isPaid = isPaidStatus(order?.payment_status) || isFreeOrder;
  const isRefunded = order?.payment_status === "refunded";
  const isCancelled = order?.status === "cancelled";
  const canCancel = order && !isCancelled && order.status === "pending" && !order.shipped_at;

  // Latest transaction (for payment ref)
  const latestTransaction = useMemo(() => {
    if (!order?.transactions?.length) return null;
    return [...order.transactions].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0];
  }, [order]);

  const providerLabel = isFreeOrder
    ? "Free"
    : getProviderLabel(latestTransaction?.provider);

  const paymentRef =
    latestTransaction?.provider_transaction_id ||
    (latestTransaction?.metadata as any)?.reference ||
    "—";

  const vendorGroups = useMemo(
    () => order ? groupItemsByVendor(order.order_items) : [],
    [order]
  );

  /* ── Load ───────────────────────────────────────────────────── */

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      setLoading(true);
      setOrderError(null);

      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) {
          setOrderError({ kind: "unknown", message: authError.message });
          setLoading(false);
          return;
        }
        if (!user) {
          router.replace(`/login?next=${encodeURIComponent(`/orders/${id}`)}`);
          return;
        }

        const { data, error } = await supabase
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
          .maybeSingle();
        console.log({ data })
        console.log({ error })
        if (error) {
          const classified = classifyError(error);
          if (process.env.NODE_ENV === "development") {
            console.group(`[OrderDetail] Supabase error — ${classified.kind}`);
            console.error("Raw:", error);
            console.error("Classified:", classified);
            console.groupEnd();
          }
          setOrderError(classified);
          setLoading(false);
          return;
        }

        if (!data) {
          setOrderError({ kind: "not_found" });
          setLoading(false);
          return;
        }

        setOrder(data as Order);
      } catch (err: any) {
        const message = err?.message ?? "Unexpected error";
        setOrderError({
          kind: message.toLowerCase().includes("fetch") ? "network" : "unknown",
          message,
        });
      } finally {
        setLoading(false);
      }
    }

    void load();

    // Realtime — re-fetch on order change
    channelRef.current = supabase
      .channel(`order-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `id=eq.${id}` },
        () => { void load(); }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "transactions", filter: `order_id=eq.${id}` },
        () => { void load(); }
      )
      .subscribe();

    return () => {
      if (channelRef.current) void supabase.removeChannel(channelRef.current);
    };
  }, [id, router, retryCount]);

  /* ── Handlers ───────────────────────────────────────────────── */

  async function handlePay() {
    if (!order) return;
    setPaying(true);
    try {
      const provider = latestTransaction?.provider?.toLowerCase() || "flutterwave";
      const endpoint = provider === "pawapay"
        ? "/api/pawapay/checkout"
        : `/api/payments/${provider}/initiate`;

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
      setRetryCount((c) => c + 1); // refetch
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
  const orderRef = String(order.order_number || order.id).slice(0, 12).toUpperCase();
  const shippingAddr = order.shipping_address;

  return (
    <div className="min-h-screen bg-[var(--color-bg)] px-4 pb-20 pt-8 sm:px-6">
      <div className="mx-auto max-w-5xl">

        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-1.5 text-[13px] text-[var(--color-text-muted)]">
          <Link href="/orders" className="hover:text-[var(--color-accent)]">Orders</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="font-medium text-[var(--color-text-primary)]">#{orderRef}</span>
        </nav>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">

          {/* ── LEFT ── */}
          <div className="space-y-4 lg:col-span-2">

            {/* Header card */}
            <div
              className="border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
              style={{ borderRadius: "var(--radius-lg)" }}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
                    Order ID
                  </p>
                  <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-[var(--color-text-primary)]">
                    #{orderRef}
                  </h1>
                  <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
                    Placed {formatDate(order.created_at)} · {formatTime(order.created_at)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {isFreeOrder && (
                    <span
                      className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium"
                      style={{
                        background: "var(--color-success-light)",
                        color: "var(--color-success)",
                        borderRadius: "var(--radius-sm)",
                      }}
                    >
                      Free
                    </span>
                  )}
                  {order.affiliate_id && (
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium text-[var(--color-text-secondary)]"
                      style={{
                        background: "var(--color-surface-secondary)",
                        borderRadius: "var(--radius-sm)",
                      }}
                      title="Purchased through an affiliate link"
                    >
                      <Tag className="h-3 w-3" /> Affiliate
                    </span>
                  )}
                  {order.integration_source === "shopify" && (
                    <span
                      className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium text-[var(--color-text-secondary)]"
                      style={{
                        background: "var(--color-surface-secondary)",
                        borderRadius: "var(--radius-sm)",
                      }}
                    >
                      Shopify
                    </span>
                  )}
                  <OrderStatusBadge status={order.status} size="md" />
                </div>
              </div>

              {/* Stepper / cancellation / refund banners */}
              {!isDigitalOrder && !isCancelled && !isRefunded && (
                <div className="mt-6">
                  <StatusStepper status={order.status} />
                </div>
              )}

              {isCancelled && (
                <div
                  className="mt-4 flex items-start gap-2.5 border border-[var(--color-danger)]/20 p-3"
                  style={{
                    background: "var(--color-danger-light)",
                    borderRadius: "var(--radius-md)",
                  }}
                >
                  <X className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-danger)]" />
                  <div>
                    <p className="text-[13px] font-medium text-[var(--color-text-primary)]">
                      Order cancelled
                    </p>
                    {order.cancelled_at && (
                      <p className="mt-0.5 text-[12px] text-[var(--color-text-secondary)]">
                        Cancelled on {formatDate(order.cancelled_at)}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {isRefunded && (
                <div
                  className="mt-4 flex items-start gap-2.5 border border-[var(--color-warning)]/20 p-3"
                  style={{
                    background: "var(--color-warning-light)",
                    borderRadius: "var(--radius-md)",
                  }}
                >
                  <RotateCcw className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-warning)]" />
                  <div>
                    <p className="text-[13px] font-medium text-[var(--color-text-primary)]">
                      Payment refunded
                    </p>
                    <p className="mt-0.5 text-[12px] text-[var(--color-text-secondary)]">
                      The full amount has been returned to your original payment method.
                    </p>
                  </div>
                </div>
              )}

              {isFreeOrder && isDigitalOrder && !isCancelled && (
                <div
                  className="mt-4 flex items-start gap-2.5 border border-[var(--color-success)]/20 p-3"
                  style={{
                    background: "var(--color-success-light)",
                    borderRadius: "var(--radius-md)",
                  }}
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-success)]" />
                  <div>
                    <p className="text-[13px] font-medium text-[var(--color-text-primary)]">
                      Access granted instantly
                    </p>
                    <p className="mt-0.5 text-[12px] text-[var(--color-text-secondary)]">
                      Find your downloads in your library.
                    </p>
                  </div>
                </div>
              )}

              {isPendingPayment && (
                <PaymentBanner paying={paying} onPay={handlePay} providerLabel={providerLabel} />
              )}
            </div>

            {/* Items grouped by vendor */}
            <div className="space-y-3">
              <h2 className="px-1 text-[12px] font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
                Items ({order.order_items.length})
              </h2>
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
            </div>

            {/* Totals */}
            <div
              className="border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
              style={{ borderRadius: "var(--radius-md)" }}
            >
              <dl className="space-y-1.5 text-[13px]">
                <div className="flex justify-between text-[var(--color-text-secondary)]">
                  <dt>Subtotal</dt>
                  <dd className="tabular-nums">
                    {isFreeOrder
                      ? <span className="text-[var(--color-success)]">Free</span>
                      : formatMoney(Number(order.subtotal ?? order.total_amount), currency)
                    }
                  </dd>
                </div>
                {Number(order.discount_amount ?? 0) > 0 && (
                  <div className="flex justify-between text-[var(--color-text-secondary)]">
                    <dt>Discount</dt>
                    <dd className="tabular-nums text-[var(--color-success)]">
                      −{formatMoney(Number(order.discount_amount), currency)}
                    </dd>
                  </div>
                )}
                {!isDigitalOrder && (
                  <div className="flex justify-between text-[var(--color-text-secondary)]">
                    <dt>Shipping</dt>
                    <dd className="tabular-nums">
                      {Number(order.shipping_amount ?? 0) === 0
                        ? <span className="text-[var(--color-success)]">Free</span>
                        : formatMoney(Number(order.shipping_amount), currency)
                      }
                    </dd>
                  </div>
                )}
                {Number(order.tax_amount ?? 0) > 0 && (
                  <div className="flex justify-between text-[var(--color-text-secondary)]">
                    <dt>Tax</dt>
                    <dd className="tabular-nums">{formatMoney(Number(order.tax_amount), currency)}</dd>
                  </div>
                )}
                <div className="flex justify-between border-t border-[var(--color-border)] pt-2 text-[14px] font-semibold text-[var(--color-text-primary)]">
                  <dt>Total</dt>
                  <dd className="tabular-nums">
                    {isFreeOrder ? "Free" : formatMoney(Number(order.total_amount), currency)}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Status timeline */}
            <StatusTimeline history={order.order_status_history ?? []} />

            {/* Payment + Shipping cards */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div
                className="border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
                style={{ borderRadius: "var(--radius-md)" }}
              >
                <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
                  <CreditCard className="h-3 w-3" /> Payment
                </div>
                <p className="text-[14px] font-medium text-[var(--color-text-primary)]">
                  {providerLabel}
                </p>
                {!isFreeOrder && paymentRef !== "—" && (
                  <p className="mt-1 truncate font-mono text-[11px] text-[var(--color-text-muted)]">
                    {paymentRef}
                  </p>
                )}
                <div className="mt-3">
                  {isFreeOrder ? (
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium"
                      style={{
                        background: "var(--color-success-light)",
                        color: "var(--color-success)",
                        borderRadius: "var(--radius-sm)",
                      }}
                    >
                      <CheckCircle2 className="h-3 w-3" /> No charge
                    </span>
                  ) : isPaid ? (
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium"
                      style={{
                        background: "var(--color-success-light)",
                        color: "var(--color-success)",
                        borderRadius: "var(--radius-sm)",
                      }}
                    >
                      <CheckCircle2 className="h-3 w-3" /> Paid
                      {order.paid_at && ` · ${formatDate(order.paid_at, { month: "short", day: "numeric" })}`}
                    </span>
                  ) : isRefunded ? (
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium"
                      style={{
                        background: "var(--color-warning-light)",
                        color: "var(--color-warning)",
                        borderRadius: "var(--radius-sm)",
                      }}
                    >
                      Refunded
                    </span>
                  ) : (
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium"
                      style={{
                        background: "var(--color-warning-light)",
                        color: "var(--color-warning)",
                        borderRadius: "var(--radius-sm)",
                      }}
                    >
                      Pending
                    </span>
                  )}
                </div>
              </div>

              {!isDigitalOrder && shippingAddr && (
                <div
                  className="border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
                  style={{ borderRadius: "var(--radius-md)" }}
                >
                  <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
                    <MapPin className="h-3 w-3" /> Ship to
                  </div>
                  <p className="text-[14px] font-medium text-[var(--color-text-primary)]">
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

            {/* Order actions */}
            <div className="flex flex-wrap items-center gap-2">
              {isPaid && (
                <Link
                  href={`/api/orders/${order.id}/invoice`}
                  className="inline-flex h-9 items-center gap-1.5 border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[12px] font-medium text-[var(--color-text-secondary)] hover:border-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                  style={{ borderRadius: "var(--radius-sm)" }}
                >
                  <FileText className="h-3.5 w-3.5" /> Download invoice
                </Link>
              )}
              {(order.status === "delivered" || isDigitalOrder) && (
                <button
                  onClick={handleReorder}
                  className="inline-flex h-9 items-center gap-1.5 border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[12px] font-medium text-[var(--color-text-secondary)] hover:border-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                  style={{ borderRadius: "var(--radius-sm)" }}
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Buy again
                </button>
              )}
              {canCancel && (
                <button
                  onClick={() => setCancelOpen(true)}
                  className="inline-flex h-9 items-center gap-1.5 border border-[var(--color-danger)]/30 px-3 text-[12px] font-medium text-[var(--color-danger)] hover:bg-[var(--color-danger-light)]"
                  style={{ borderRadius: "var(--radius-sm)" }}
                >
                  <X className="h-3.5 w-3.5" /> Cancel order
                </button>
              )}
              <Link
                href={`/help/orders?order=${order.id}`}
                className="ml-auto inline-flex h-9 items-center gap-1.5 px-2 text-[12px] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-accent)]"
              >
                Need help?
              </Link>
            </div>
          </div>

          {/* ── RIGHT ── */}
          <aside className="lg:col-span-1">
            {!isDigitalOrder && order.tracking_number ? (
              <TrackingCard order={order} />
            ) : (
              <DigitalAssetsPanel order={order} />
            )}
          </aside>
        </div>
      </div>

      <CancelDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={handleCancel}
        loading={cancelling}
      />
    </div>
  );
}

/* ─── Digital assets sidebar panel ──────────────────────────────── */

function DigitalAssetsPanel({ order }: { order: Order }) {
  const digitalItems = order.order_items.filter(i => i.product_type === "digital" && i.digital_download_url);

  if (digitalItems.length === 0) {
    return (
      <div
        className="border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
        style={{ borderRadius: "var(--radius-lg)" }}
      >
        <div className="flex items-center gap-2 text-[13px] font-medium text-[var(--color-text-primary)]">
          <Package className="h-4 w-4 text-[var(--color-text-muted)]" />
          Order details
        </div>
        <p className="mt-2 text-[12px] text-[var(--color-text-secondary)]">
          {order.notes || "No additional details to show."}
        </p>
      </div>
    );
  }

  return (
    <div
      className="border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
      style={{ borderRadius: "var(--radius-lg)" }}
    >
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-medium text-[var(--color-text-primary)]">
          Your downloads
        </p>
        <Link
          href="/dashboard/library"
          className="text-[11px] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-accent)]"
        >
          See all →
        </Link>
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
                className="flex items-center gap-2.5 border border-[var(--color-border)] p-2.5 transition-colors hover:border-[var(--color-accent)]/40"
                style={{ borderRadius: "var(--radius-sm)" }}
              >
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center"
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
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[var(--color-text-muted)]" />
              </Link>
            </li>
          );
        })}
      </ul>

      <Link
        href="/dashboard/library"
        className="mt-3 flex h-9 w-full items-center justify-center gap-1 border border-[var(--color-border)] text-[12px] font-medium text-[var(--color-text-secondary)] hover:border-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
        style={{ borderRadius: "var(--radius-sm)" }}
      >
        Open library <ChevronRight className="h-3 w-3" />
      </Link>
    </div>
  );
}