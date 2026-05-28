"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Package, CreditCard, Lock, Loader2,
  CheckCircle2, Clock, Truck, MapPin, ChevronRight,
  ShieldCheck, Copy, ExternalLink, AlertCircle, Check,
  Settings2, Home, BadgeCheck, MessageSquare, FileText, Download,
  XCircle, RotateCcw, Star, Mail, RefreshCcw, Tag, Store,
  Calendar, Key,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { TrackingCard } from "@/components/orders/TrackingCard";
import { toast } from "sonner";
import {
  getDownloadUrl,
  triggerDownload
} from "@/lib/download";
/* ── Constants ──────────────────────────────────────────────────────────── */

const PROVIDER_LABELS: Record<string, string> = {
  nowpayments: "Crypto (NOWPayments)",
  pesapal: "PesaPal",
  pawapay: "PawaPay",
  flutterwave: "Flutterwave",
  paypal: "PayPal",
  afripay: "AfriPay",
};

const PHYSICAL_STEPS = [
  { key: "pending", label: "Placed", icon: FileText },
  { key: "confirmed", label: "Confirmed", icon: Check },
  { key: "processing", label: "Processing", icon: Settings2 },
  { key: "shipped", label: "Shipped", icon: Truck },
  { key: "delivered", label: "Delivered", icon: Home },
];

const DIGITAL_STEPS = [
  { key: "pending", label: "Placed", icon: FileText },
  { key: "paid", label: "Paid", icon: CreditCard },
  { key: "delivered", label: "Access Granted", icon: Key },
  { key: "completed", label: "Complete", icon: BadgeCheck },
];

const DIGITAL_DOWNLOAD_EXTS = new Set([
  "pdf", "zip", "rar", "exe", "dmg", "mp4", "mp3",
  "png", "jpg", "jpeg", "txt", "csv", "epub", "mobi",
]);

/* ── Helpers ────────────────────────────────────────────────────────────── */

function getProviderLabel(p?: string | null) {
  if (!p) return "—";
  return PROVIDER_LABELS[p.toLowerCase()] ?? p;
}

function getPaymentRef(order: any): string {
  const provider = (order.payment_provider ?? "").toLowerCase();
  const ref =
    provider === "flutterwave"
      ? order.flutterwave_tx_ref || String(order.flutterwave_transaction_id || "")
      : provider === "pesapal"
        ? order.pesapal_tracking_id || order.pesapal_merchant_ref
        : provider === "nowpayments"
          ? String(order.nowpayments_payment_id || "")
          : provider === "pawapay"
            ? order.pawapay_deposit_id
            : provider === "paypal"
              ? order.paypal_order_id || order.paypal_capture_id
              : provider === "afripay"
                ? order.afripay_reference || order.afripay_transaction_id
                : order.payment_external_reference;
  return ref || "—";
}

function formatDate(d?: string | null, opts?: Intl.DateTimeFormatOptions) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-US", opts ?? {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function isDigitalOrder(orderItems: any[] | null | undefined): boolean {
  if (!orderItems?.length) return false;
  return orderItems.every(i => i.product_type === "digital");
}

async function copy(text: string, label = "Copied") {
  try { await navigator.clipboard.writeText(text); toast.success(label); }
  catch { toast.error("Couldn't copy"); }
}

/* ── Skeleton ───────────────────────────────────────────────────────────── */

function Pulse({ className }: { className?: string }) {
  return <div className={`rounded-xl bg-[var(--color-surface-secondary)] animate-pulse ${className}`} />;
}

function PageSkeleton() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] pt-10 pb-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-6">
        <Pulse className="h-4 w-32" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Pulse className="h-56" />
            <Pulse className="h-44" />
            <div className="grid grid-cols-2 gap-4">
              <Pulse className="h-32" />
              <Pulse className="h-32" />
            </div>
          </div>
          <div className="space-y-4">
            <Pulse className="h-80" />
            <Pulse className="h-40" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Status stepper ─────────────────────────────────────────────────────── */

function StatusStepper({ status, isDigital }: { status: string; isDigital: boolean }) {
  if (status === "cancelled") return (
    <div className="flex items-center gap-2 py-3 px-4 rounded-xl bg-red-50 border border-red-100">
      <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
      <p className="text-sm font-semibold text-red-700">This order has been cancelled.</p>
    </div>
  );

  if (status === "refunded") return (
    <div className="flex items-center gap-2 py-3 px-4 rounded-xl bg-slate-50 border border-slate-200">
      <RefreshCcw className="h-4 w-4 text-slate-500 shrink-0" />
      <p className="text-sm font-semibold text-slate-700">This order has been refunded.</p>
    </div>
  );

  const STEPS = isDigital ? DIGITAL_STEPS : PHYSICAL_STEPS;
  const ORDER = STEPS.map(s => s.key);
  let currentIdx = ORDER.indexOf(status);
  if (currentIdx === -1) {
    if (["paid"].includes(status)) currentIdx = isDigital ? 1 : 1;
    else if (["processing", "shipped"].includes(status)) currentIdx = STEPS.length - 2;
    else currentIdx = 0;
  }

  return (
    <div className="flex items-center w-full">
      {STEPS.map((step, i) => {
        const Icon = step.icon;
        const done = i < currentIdx;
        const active = i === currentIdx;
        return (
          <React.Fragment key={step.key}>
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <div className={`
                h-8 w-8 rounded-full flex items-center justify-center transition-all duration-300
                ${done ? "bg-emerald-500 text-white" : ""}
                ${active ? "bg-[var(--color-accent)] text-white ring-2 ring-[var(--color-accent)] scale-110" : ""}
                ${!done && !active ? "bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)]" : ""}
              `}>
                {done ? <Check className="h-3.5 w-3.5 stroke-[2.5]" /> : <Icon className="h-3.5 w-3.5" />}
              </div>
              <span className={`text-[9px] font-bold tracking-wider uppercase whitespace-nowrap
                ${done || active ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-muted)]"}`}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-[2px] flex-1 mb-4 mx-0.5 rounded-full transition-colors duration-500
                ${i < currentIdx ? "bg-emerald-400" : "bg-[var(--color-border)]"}`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* ── Payment banner ─────────────────────────────────────────────────────── */

function PaymentBanner({ paying, onPay }: { paying: boolean; onPay: () => void }) {
  return (
    <div className="mt-5 rounded-2xl overflow-hidden border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50">
      <div className="px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-amber-950">Payment Required</p>
            <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
              Your order is reserved. Complete payment to begin processing.
            </p>
          </div>
        </div>
        <Button
          onClick={onPay}
          disabled={paying}
          size="sm"
          className="w-full sm:w-auto shrink-0 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold rounded-xl transition-all shadow-lg shadow-amber-200 border-0"
        >
          {paying
            ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Redirecting…</>
            : <><Lock className="h-3.5 w-3.5 mr-2" />Pay Now</>
          }
        </Button>
      </div>
      <div className="px-5 py-2 bg-amber-100/60 border-t border-amber-200 flex items-center gap-2">
        <ShieldCheck className="h-3.5 w-3.5 text-amber-600 shrink-0" />
        <span className="text-[11px] text-amber-700 font-medium">Secured with 256-bit SSL encryption</span>
      </div>
    </div>
  );
}

/* ── Refund banner ──────────────────────────────────────────────────────── */

function RefundBanner({ amount, currency, when }: { amount: number; currency: string; when?: string | null }) {
  return (
    <div className="mt-5 rounded-2xl overflow-hidden border border-slate-200 bg-slate-50">
      <div className="px-5 py-4 flex items-start gap-3">
        <div className="mt-0.5 h-10 w-10 rounded-xl bg-slate-200 flex items-center justify-center text-slate-600 shrink-0">
          <RefreshCcw className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-slate-900">Order refunded</p>
          <p className="text-xs text-slate-600 mt-0.5">
            {formatCurrency(amount, currency)} returned
            {when && <> on {formatDate(when, { month: "short", day: "numeric", year: "numeric" })}</>}.
            Funds may take 3–5 business days to appear in your account.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── Order item row ─────────────────────────────────────────────────────── */

function OrderItemRow({ item, currency, accessByProductId }: {
  item: any;
  currency: string;
  accessByProductId: Map<string, any>;
}) {
  const isDigital = item.product_type === "digital";
  const access = item.product_id ? accessByProductId.get(item.product_id) : null;
  const rawAccessUrl =
    access?.access_url || item.digital_download_url;

  const accessUrl = rawAccessUrl
    ? getDownloadUrl(
      rawAccessUrl,
      item?.product_name || "download"
    )
    : null;
  const accessRevoked = !!access?.revoked_at;
  const accessExpiresAt = access?.expires_at;

  let linkAction = { label: "Open access", icon: <ExternalLink className="h-3 w-3" />, isDownload: false };
  if (accessUrl && !accessRevoked) {
    try {
      const parsed = new URL(accessUrl);
      const ext = parsed.pathname.split(".").pop()?.toLowerCase();
      if (ext && DIGITAL_DOWNLOAD_EXTS.has(ext)) {
        linkAction = { label: "Download file", icon: <Download className="h-3 w-3" />, isDownload: true };
      }
    } catch { /* not a URL — leave default */ }
  }

  return (
    <li className="group flex gap-4 items-center py-3.5">
      <div className="h-14 w-14 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] overflow-hidden flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105">
        {item.product_image
          ? <img src={item.product_image} alt={item.product_name} className="h-full w-full object-cover" />
          : <Package className="h-5 w-5 text-[var(--color-text-muted)]" />
        }
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <p className="font-semibold text-[var(--color-text-primary)] truncate text-sm">{item.product_name}</p>
          {isDigital && (
            <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider bg-orange-500/10 text-orange-500 px-1.5 py-0.5 rounded-md">
              Digital
            </span>
          )}
        </div>
        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
          Qty {item.quantity} · {formatCurrency(Number(item.unit_price), currency)} each
        </p>
        {isDigital && accessUrl && !accessRevoked && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
            <a
              href={`/api/download?url=${encodeURIComponent(rawAccessUrl || "")}&filename=${encodeURIComponent(item?.product_name || "download")}`}
              download
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-sky-600 dark:text-sky-400 hover:underline"
            >
              {linkAction.icon} {linkAction.label}
            </a>
            {accessExpiresAt && (
              <span className="inline-flex items-center gap-1 text-[10px] text-[var(--color-text-muted)]">
                <Calendar className="h-2.5 w-2.5" />
                Access until {formatDate(accessExpiresAt, { month: "short", day: "numeric", year: "numeric" })}
              </span>
            )}
            {!accessExpiresAt && access && (
              <span className="text-[10px] text-[var(--color-text-muted)]">Lifetime access</span>
            )}
            {typeof item.download_count === "number" && item.download_count > 0 && (
              <span className="text-[10px] text-[var(--color-text-muted)]">
                Downloaded {item.download_count}×
              </span>
            )}
          </div>
        )}
        {isDigital && accessRevoked && (
          <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-rose-600 mt-1.5">
            <AlertCircle className="h-3 w-3" />
            Access revoked
            {access?.revoke_reason && <span className="text-[var(--color-text-muted)] font-normal">· {access.revoke_reason}</span>}
          </div>
        )}
      </div>
      <p className="text-sm font-bold text-[var(--color-text-primary)] shrink-0">
        {formatCurrency(Number(item.total_price), currency)}
      </p>
    </li>
  );
}

/* ── Info card ──────────────────────────────────────────────────────────── */

function InfoCard({ icon: Icon, label, children }: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-4 w-4 text-[var(--color-text-muted)]" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">{label}</span>
      </div>
      {children}
    </div>
  );
}

/* ── Digital Access card ────────────────────────────────────────────────── */

function DigitalAccessCard({
  order, digitalAccess, onResend, resending,
}: {
  order: any;
  digitalAccess: any[];
  onResend: () => void;
  resending: boolean;
}) {
  const isPaid = order.payment_status === "paid" || order.payment_status === "completed";
  const accessGranted = order.order_items?.some((i: any) => i.access_granted_at) || digitalAccess.length > 0;
  const buyerEmail = order.shipping_address?.email;

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <div className="flex items-center gap-2 mb-3">
        <Key className="h-4 w-4 text-[var(--color-text-muted)]" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
          Digital Access
        </span>
      </div>
      {!isPaid ? (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
          Complete payment above to unlock your digital items.
        </div>
      ) : !accessGranted ? (
        <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800">
          Payment received. Access is being provisioned — usually within a minute.
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-emerald-900">Access granted</p>
              <p className="text-[11px] text-emerald-700 mt-0.5">Click any item above to download or open.</p>
            </div>
          </div>
          {buyerEmail && (
            <div className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
              Access links were also sent to <span className="font-semibold text-[var(--color-text-primary)]">{buyerEmail}</span>
            </div>
          )}
          <button
            onClick={onResend}
            disabled={resending}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--color-border)] hover:bg-[var(--color-surface-secondary)] text-xs font-semibold text-[var(--color-text-primary)] transition-all disabled:opacity-60"
          >
            {resending
              ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Sending…</>
              : <><Mail className="h-3.5 w-3.5" />Resend access email</>
            }
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Vendor card(s) ─────────────────────────────────────────────────────── */

function VendorCards({ items }: { items: any[] }) {
  const vendors = useMemo(() => {
    const map = new Map<string, any>();
    for (const item of items ?? []) {
      const v = item.vendors;
      if (v?.id && !map.has(v.id)) map.set(v.id, v);
    }
    return Array.from(map.values());
  }, [items]);

  if (vendors.length === 0) return null;

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <div className="flex items-center gap-2 mb-3">
        <Store className="h-4 w-4 text-[var(--color-text-muted)]" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
          {vendors.length > 1 ? `Vendors (${vendors.length})` : "Vendor"}
        </span>
      </div>
      <div className="space-y-2">
        {vendors.map(v => (
          <div key={v.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-[var(--color-surface-secondary)] transition-colors">
            <div className="h-9 w-9 rounded-xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)] overflow-hidden flex items-center justify-center shrink-0">
              {v.business_logo
                ? <img src={v.business_logo} alt={v.business_name} className="h-full w-full object-cover" />
                : <Store className="h-4 w-4 text-[var(--color-text-muted)]" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <Link href={`/vendor/${v.business_slug ?? v.id}`} className="text-sm font-semibold text-[var(--color-text-primary)] hover:text-[var(--color-accent)] truncate block">
                {v.business_name}
              </Link>
              <Link href={`/dashboard/messages?vendor=${v.id}`} className="text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors inline-flex items-center gap-1">
                <MessageSquare className="h-2.5 w-2.5" /> Message
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Quick actions ──────────────────────────────────────────────────────── */

function QuickActions({
  order, paying, onPay, onCancel, onReorder, cancelling, reordering,
}: {
  order: any;
  paying: boolean;
  cancelling: boolean;
  reordering: boolean;
  onPay: () => void;
  onCancel: () => void;
  onReorder: () => void;
}) {
  const isPending = order.status === "pending";
  const isDelivered = order.status === "delivered" || order.status === "completed";
  const showPay = order.payment_status === "pending" && order.status !== "cancelled";

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] mb-3">
        Quick Actions
      </p>
      <div className="space-y-2">
        {showPay && (
          <button
            onClick={onPay}
            disabled={paying}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--color-accent)] hover:opacity-90 active:scale-[0.98] text-white text-xs font-bold transition-all disabled:opacity-60"
          >
            {paying ? <Loader2 className="h-4 w-4 animate-spin shrink-0" /> : <CreditCard className="h-4 w-4 shrink-0" />}
            {paying ? "Redirecting…" : "Complete Payment"}
          </button>
        )}
        <a
          href={`/api/orders/${order.id}/invoice`}
          target="_blank"
          rel="noopener"
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-[var(--color-border)] hover:bg-[var(--color-surface-secondary)] text-xs font-semibold text-[var(--color-text-primary)] transition-all"
        >
          <Download className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" />
          Download Invoice
        </a>
        <button
          onClick={onReorder}
          disabled={reordering}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-[var(--color-border)] hover:bg-[var(--color-surface-secondary)] text-xs font-semibold text-[var(--color-text-primary)] transition-all disabled:opacity-60"
        >
          {reordering ? <Loader2 className="h-4 w-4 animate-spin shrink-0" /> : <RotateCcw className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" />}
          {reordering ? "Adding to cart…" : "Reorder"}
        </button>
        {isDelivered && (
          <Link
            href={`/dashboard/orders/${order.id}#reviews`}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-[var(--color-border)] hover:bg-[var(--color-surface-secondary)] text-xs font-semibold text-[var(--color-text-primary)] transition-all"
          >
            <Star className="h-4 w-4 shrink-0 text-amber-400" />
            Leave a Review
          </Link>
        )}
        {isPending && (
          <button
            onClick={onCancel}
            disabled={cancelling}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-rose-200 hover:bg-rose-50 text-xs font-semibold text-rose-600 transition-all disabled:opacity-60"
          >
            {cancelling ? <Loader2 className="h-4 w-4 animate-spin shrink-0" /> : <XCircle className="h-4 w-4 shrink-0" />}
            {cancelling ? "Cancelling…" : "Cancel Order"}
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Cancel confirm dialog ──────────────────────────────────────────────── */

function CancelDialog({ order, onConfirm, onClose, cancelling }: {
  order: any; onConfirm: () => void; onClose: () => void; cancelling: boolean;
}) {
  const isPaid = order?.payment_status === "paid" || order?.payment_status === "completed";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-xl animate-in zoom-in-95 duration-150">
        <div className="h-10 w-10 rounded-full bg-rose-500/10 flex items-center justify-center mb-4">
          <AlertCircle className="h-5 w-5 text-rose-500" />
        </div>
        <h3 className="text-sm font-bold text-[var(--color-text-primary)] mb-1">Cancel this order?</h3>
        <p className="text-xs text-[var(--color-text-muted)] leading-relaxed mb-5">
          This cannot be undone. {isPaid
            ? "A refund will be processed within 3–5 business days."
            : "No payment has been captured, so nothing will be refunded."}
        </p>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            disabled={cancelling}
            className="flex-1 h-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-xs font-semibold text-[var(--color-text-primary)] hover:border-[var(--color-border-strong)] transition-all disabled:opacity-50"
          >
            Keep Order
          </button>
          <button
            onClick={onConfirm}
            disabled={cancelling}
            className="flex-1 h-9 rounded-xl bg-rose-500 text-xs font-semibold text-white hover:bg-rose-600 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {cancelling && <Loader2 className="h-3 w-3 animate-spin" />}
            {cancelling ? "Cancelling…" : "Yes, Cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main page ──────────────────────────────────────────────────────────── */

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [order, setOrder] = useState<any>(null);
  const [statusHistory, setStatusHistory] = useState<any[]>([]);
  const [digitalAccess, setDigitalAccess] = useState<any[]>([]);
  const [refundTx, setRefundTx] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [resending, setResending] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const channelRef = useRef<any>(null);

  /* ── Load + realtime ──────────────────────────────────────────────────── */

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function fetchOrder(userId: string) {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          order_items (
            id, product_id, product_name, product_image, quantity, unit_price, total_price,
            vendor_id, product_type, digital_download_url, download_count, access_granted_at,
            vendors ( id, business_name, business_slug, business_logo )
          )
        `)
        .eq("id", id)
        .eq("buyer_id", userId)
        .maybeSingle();

      if (cancelled) return;
      if (error || !data) { setOrder(null); setLoading(false); return; }
      setOrder(data);

      const productIds = (data.order_items ?? [])
        .filter((i: any) => i.product_id)
        .map((i: any) => i.product_id);

      const [historyRes, accessRes, refundRes] = await Promise.all([
        supabase
          .from("order_status_history")
          .select("id, previous_status, new_status, notes, created_at")
          .eq("order_id", data.id)
          .order("created_at", { ascending: true }),
        productIds.length > 0
          ? supabase
            .from("digital_access")
            .select("id, product_id, access_url, subtype, granted_at, expires_at, revoked_at, revoke_reason")
            .eq("user_id", userId)
            .in("product_id", productIds)
          : Promise.resolve({ data: [] }),
        data.payment_status === "refunded"
          ? supabase
            .from("transactions")
            .select("id, amount, currency, amount_usd, type, status, created_at")
            .eq("order_id", data.id)
            .eq("type", "refund")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      if (cancelled) return;
      setStatusHistory(historyRes.data ?? []);
      setDigitalAccess(accessRes.data ?? []);
      setRefundTx(refundRes.data ?? null);
      setLoading(false);
    }

    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace(`/login?next=${encodeURIComponent(`/dashboard/orders/${id}`)}`); return; }
      await fetchOrder(user.id);
      if (channelRef.current) {
        await supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      if (cancelled) return;

      channelRef.current = supabase
        .channel(`order-detail-${id}`)
        .on("postgres_changes",
          { event: "*", schema: "public", table: "orders", filter: `id=eq.${id}` },
          () => fetchOrder(user.id),
        )
        .on("postgres_changes",
          { event: "*", schema: "public", table: "transactions", filter: `order_id=eq.${id}` },
          () => fetchOrder(user.id),
        )
        .subscribe();
    }

    init();
    return () => {
      cancelled = true;
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [id, router]);

  useEffect(() => {
    if (!order || order.payment_status !== "pending") return;
    if ((order.payment_provider || "").toLowerCase() === "pawapay" && order.pawapay_deposit_id) {
      fetch("/api/payments/pawapay/sync-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id, trackingId: order.pawapay_deposit_id }),
      }).catch(console.error);
    }
  }, [order?.id, order?.payment_status]);

  /* ── Handlers ─────────────────────────────────────────────────────────── */

  async function handlePay() {
    if (!order) return;
    setPaying(true);
    try {
      const provider = (order.payment_provider || "flutterwave").toLowerCase();
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
          country: order.shipping_address?.country_code || order.shipping_address?.countryCode || "RW",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || "Payment initiation failed");
      const url = data.redirectUrl || data.invoiceUrl || data.approvalUrl || data.redirectURL;
      if (url) window.location.href = url;
      else throw new Error("No payment link returned. Please contact support.");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setPaying(false);
    }
  }

  async function handleCancel() {
    if (!order) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/orders/update/cancelled/${order.id}`, { method: "PATCH" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to cancel order");
      toast.success("Order cancelled.");
      setShowCancelConfirm(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setCancelling(false);
    }
  }

  async function handleReorder() {
    if (!order) return;
    setReordering(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/reorder`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reorder");
      toast.success("Items added to your cart.");
      if (data.cartUrl) router.push(data.cartUrl);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setReordering(false);
    }
  }

  async function handleResendAccess() {
    if (!order) return;
    setResending(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/resend-access`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to resend");
      toast.success("Access email sent.");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setResending(false);
    }
  }

  /* ── Derived state — ALL useMemo BEFORE any early returns ─────────────── */

  // ✅ FIX: moved above the loading/not-found guards so hook count is stable
  const accessByProductId = useMemo(() => {
    const m = new Map<string, any>();
    for (const a of digitalAccess) {
      if (a.product_id) m.set(a.product_id, a);
    }
    return m;
  }, [digitalAccess]);

  const subtotal = useMemo(() => {
    if (!order) return 0;
    if (order.subtotal && Number(order.subtotal) > 0) return Number(order.subtotal);
    const itemsSum = (order.order_items ?? []).reduce((s: number, i: any) => s + Number(i.total_price || 0), 0);
    if (itemsSum > 0) return itemsSum;
    return Number(order.total_amount || 0) - Number(order.tax_amount || 0) - Number(order.shipping_amount || 0) + Number(order.discount_amount || 0);
  }, [order]);

  /* ── Guards — AFTER all hooks ─────────────────────────────────────────── */

  if (loading) return <PageSkeleton />;
  if (!order) return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col items-center justify-center gap-4 px-4">
      <div className="h-16 w-16 rounded-2xl bg-[var(--color-surface-secondary)] flex items-center justify-center">
        <Package className="h-8 w-8 text-[var(--color-text-muted)]" />
      </div>
      <p className="text-[var(--color-text-secondary)] font-medium text-center">
        Order not found or you don't have access.
      </p>
      <Button asChild variant="outline" size="sm">
        <Link href="/dashboard/orders"><ArrowLeft className="h-4 w-4 mr-2" />Back to orders</Link>
      </Button>
    </div>
  );

  /* ── Remaining derived values (no hooks, safe after guards) ───────────── */

  const currency = order.currency || "USD";
  const orderRef = String(order.order_number || order.id).slice(0, 12).toUpperCase();
  const paymentRef = getPaymentRef(order);
  const providerLabel = getProviderLabel(order.payment_provider);
  const addr = order.shipping_address;
  const billingAddr = order.billing_address;
  const isDigital = isDigitalOrder(order.order_items);
  const isPaid = order.payment_status === "paid" || order.payment_status === "completed";
  const isRefunded = order.payment_status === "refunded" || order.status === "refunded";

  const financials = [
    { label: "Subtotal", value: formatCurrency(subtotal, currency) },
    ...(Number(order.shipping_amount) > 0 || !isDigital
      ? [{ label: "Shipping", value: Number(order.shipping_amount) > 0 ? formatCurrency(Number(order.shipping_amount), currency) : "Free", accent: !order.shipping_amount }]
      : []),
    ...(Number(order.discount_amount) > 0 ? [{ label: "Discount", value: `−${formatCurrency(Number(order.discount_amount), currency)}`, accent: true }] : []),
    ...(Number(order.tax_amount) > 0 ? [{ label: "Tax", value: formatCurrency(Number(order.tax_amount), currency) }] : []),
  ];

  const timeline = statusHistory.length > 0
    ? statusHistory.map(h => ({
      label: h.new_status.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase()),
      date: h.created_at,
      icon: h.new_status === "cancelled" ? AlertCircle : h.new_status === "delivered" ? Home : h.new_status === "shipped" ? Truck : h.new_status === "paid" ? CreditCard : FileText,
      color: h.new_status === "cancelled" ? "text-red-500" : h.new_status === "delivered" || h.new_status === "completed" ? "text-emerald-600" : "text-[var(--color-text-muted)]",
      note: h.notes,
    }))
    : [
      { label: "Order placed", date: order.created_at, icon: FileText, color: "text-[var(--color-text-muted)]", note: null },
      { label: "Payment received", date: order.paid_at, icon: CreditCard, color: "text-emerald-600", note: null },
      { label: "Shipped", date: order.shipped_at, icon: Truck, color: "text-blue-600", note: null },
      { label: "Delivered", date: order.delivered_at, icon: Home, color: "text-emerald-600", note: null },
      { label: "Cancelled", date: order.cancelled_at, icon: AlertCircle, color: "text-red-500", note: null },
    ].filter(e => e.date);

  const detailRows = [
    { label: "Order ID", value: order.id },
    { label: "Payment Ref", value: paymentRef !== "—" ? paymentRef : null },
    { label: "Tracking", value: order.tracking_number },
    { label: "Shopify Order", value: order.shopify_order_number ? `#${order.shopify_order_number}` : null },
  ].filter(r => r.value);

  /* ── Render ───────────────────────────────────────────────────────────── */

  return (
    <>
      {showCancelConfirm && (
        <CancelDialog
          order={order}
          onConfirm={handleCancel}
          onClose={() => setShowCancelConfirm(false)}
          cancelling={cancelling}
        />
      )}

      <div className="min-h-screen bg-[var(--color-bg)] pt-10 pb-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">

          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] mb-7">
            <Link href="/dashboard/orders" className="hover:text-[var(--color-accent)] transition-colors font-medium">
              Orders
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-[var(--color-text-primary)] font-semibold">#{orderRef}</span>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* ── LEFT COLUMN ── */}
            <div className="lg:col-span-2 space-y-5">

              {/* Header + stepper */}
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">Order</span>
                    <h1 className="text-xl font-black text-[var(--color-text-primary)] mt-0.5 tracking-tight">#{orderRef}</h1>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">{formatDate(order.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isDigital && (
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-orange-500/10 text-orange-500 px-2 py-1 rounded-md">
                        Digital
                      </span>
                    )}
                    <OrderStatusBadge status={order.status} size="md" />
                  </div>
                </div>
                <StatusStepper status={order.status} isDigital={isDigital} />
                {order.payment_status === "pending" && order.status !== "cancelled" && (
                  <PaymentBanner paying={paying} onPay={handlePay} />
                )}
                {isRefunded && (
                  <RefundBanner
                    amount={Number(refundTx?.amount ?? order.total_amount)}
                    currency={refundTx?.currency ?? currency}
                    when={refundTx?.created_at ?? order.updated_at}
                  />
                )}
              </div>

              {/* Items */}
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
                <h2 className="text-sm font-bold text-[var(--color-text-primary)] mb-1">
                  Items ({order.order_items?.length ?? 0})
                </h2>
                <ul className="divide-y divide-[var(--color-border)]">
                  {order.order_items?.map((item: any) => (
                    <OrderItemRow
                      key={item.id}
                      item={item}
                      currency={currency}
                      accessByProductId={accessByProductId}
                    />
                  ))}
                </ul>
                <div className="mt-4 pt-4 border-t border-[var(--color-border)] space-y-2 text-sm">
                  {financials.map(f => (
                    <div key={f.label} className="flex justify-between text-[var(--color-text-secondary)]">
                      <span>{f.label}</span>
                      <span className={(f as any).accent ? "text-emerald-600 font-medium" : ""}>{f.value}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-black text-base pt-2 border-t border-[var(--color-border)]">
                    <span className="text-[var(--color-text-primary)]">Total</span>
                    <span className="text-[var(--color-accent)]">
                      {formatCurrency(Number(order.total_amount), currency)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Buyer notes */}
              {order.notes && (
                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 text-[var(--color-text-muted)]" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
                      Your note
                    </span>
                  </div>
                  <p className="text-sm text-[var(--color-text-primary)] leading-relaxed whitespace-pre-wrap">
                    {order.notes}
                  </p>
                </div>
              )}

              {/* Payment + delivery */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoCard icon={CreditCard} label="Payment">
                  <p className="font-semibold text-[var(--color-text-primary)] text-sm">{providerLabel}</p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <p className="text-xs text-[var(--color-text-muted)] font-mono truncate flex-1">{paymentRef}</p>
                    {paymentRef !== "—" && (
                      <button
                        onClick={() => copy(paymentRef, "Reference copied")}
                        className="shrink-0 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border
                      ${isRefunded
                        ? "bg-slate-50 text-slate-700 border-slate-200"
                        : isPaid
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                      {isRefunded
                        ? <><RefreshCcw className="h-3 w-3" />Refunded</>
                        : isPaid
                          ? <><CheckCircle2 className="h-3 w-3" />Paid</>
                          : <><Clock className="h-3 w-3" />Pending</>
                      }
                    </span>
                    {order.paid_at && !isRefunded && (
                      <span className="text-[11px] text-[var(--color-text-muted)]">
                        {formatDate(order.paid_at, { month: "short", day: "numeric" })}
                      </span>
                    )}
                  </div>
                </InfoCard>

                <InfoCard icon={isDigital ? Mail : MapPin} label={isDigital ? "Delivery" : "Ship To"}>
                  {isDigital ? (
                    <>
                      <p className="font-semibold text-[var(--color-text-primary)] text-sm">Digital Delivery</p>
                      {addr?.email && <p className="text-xs text-[var(--color-text-muted)] mt-1">{addr.email}</p>}
                      {addr?.phone && <p className="text-xs text-[var(--color-text-muted)]">{addr.phone}</p>}
                      <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        <Mail className="h-2.5 w-2.5" /> Sent to email
                      </span>
                    </>
                  ) : addr ? (
                    <>
                      <p className="font-semibold text-[var(--color-text-primary)] text-sm">
                        {addr.firstName ?? addr.first_name} {addr.lastName ?? addr.last_name}
                      </p>
                      <p className="text-xs text-[var(--color-text-muted)] mt-1 leading-relaxed">
                        {[addr.address1, addr.address2, addr.city, addr.country].filter(Boolean).join(", ")}
                      </p>
                      {addr.phone && <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{addr.phone}</p>}
                    </>
                  ) : (
                    <p className="text-xs text-[var(--color-text-muted)]">No address provided</p>
                  )}
                </InfoCard>
              </div>

              {/* Billing address */}
              {billingAddr && JSON.stringify(billingAddr) !== JSON.stringify(addr) && (
                <InfoCard icon={Tag} label="Billing">
                  <p className="font-semibold text-[var(--color-text-primary)] text-sm">
                    {billingAddr.firstName ?? billingAddr.first_name} {billingAddr.lastName ?? billingAddr.last_name}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1 leading-relaxed">
                    {[billingAddr.address1, billingAddr.address2, billingAddr.city, billingAddr.country].filter(Boolean).join(", ")}
                  </p>
                </InfoCard>
              )}

              {/* Timeline */}
              {timeline.length > 0 && (
                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
                  <h2 className="text-sm font-bold text-[var(--color-text-primary)] mb-4">Timeline</h2>
                  <div>
                    {timeline.map((event: any, i: number) => {
                      const Icon = event.icon;
                      return (
                        <div key={`${event.label}-${event.date}`} className="flex gap-3 items-start">
                          <div className="flex flex-col items-center">
                            <div className={`h-7 w-7 rounded-full bg-[var(--color-surface-secondary)] border border-[var(--color-border)] flex items-center justify-center shrink-0 ${event.color}`}>
                              <Icon className="h-3.5 w-3.5" />
                            </div>
                            {i < timeline.length - 1 && (
                              <div className="w-px h-6 bg-[var(--color-border)] my-1" />
                            )}
                          </div>
                          <div className="pb-4 pt-0.5">
                            <p className="text-sm font-semibold text-[var(--color-text-primary)] capitalize">{event.label}</p>
                            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{formatDate(event.date)}</p>
                            {event.note && (
                              <p className="text-xs text-[var(--color-text-secondary)] mt-1 italic">{event.note}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Technical details */}
              {detailRows.length > 0 && (
                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
                  <h2 className="text-sm font-bold text-[var(--color-text-primary)] mb-4">Order Details</h2>
                  <div className="space-y-3">
                    {detailRows.map(row => (
                      <div key={row.label} className="flex items-start justify-between gap-4">
                        <span className="text-xs text-[var(--color-text-muted)] font-medium shrink-0">{row.label}</span>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-xs font-mono text-[var(--color-text-primary)] truncate">{row.value}</span>
                          <button
                            onClick={() => copy(String(row.value))}
                            className="shrink-0 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── RIGHT COLUMN ── */}
            <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
              {isDigital ? (
                <DigitalAccessCard
                  order={order}
                  digitalAccess={digitalAccess}
                  onResend={handleResendAccess}
                  resending={resending}
                />
              ) : (
                <TrackingCard order={order} />
              )}

              <VendorCards items={order.order_items ?? []} />

              <QuickActions
                order={order}
                paying={paying}
                cancelling={cancelling}
                reordering={reordering}
                onPay={handlePay}
                onCancel={() => setShowCancelConfirm(true)}
                onReorder={handleReorder}
              />

              {/* Summary */}
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] mb-4">Summary</p>
                <p className="text-2xl font-black text-[var(--color-accent)] tabular-nums tracking-tight mb-4">
                  {formatCurrency(Number(order.total_amount), currency)}
                </p>
                <div className="space-y-2.5 text-xs">
                  {[
                    { label: "Status", value: <OrderStatusBadge status={order.status} size="sm" /> },
                    { label: "Payment", value: <span className={isRefunded ? "text-slate-600 font-semibold" : isPaid ? "text-emerald-600 font-semibold" : "text-amber-600 font-semibold"}>{isRefunded ? "Refunded" : isPaid ? "Paid" : "Pending"}</span> },
                    { label: "Provider", value: <span className="text-[var(--color-text-primary)]">{providerLabel}</span> },
                    { label: "Currency", value: <span className="text-[var(--color-text-primary)] font-mono">{currency}</span> },
                    { label: "Items", value: <span className="text-[var(--color-text-primary)]">{order.order_items?.length ?? 0}</span> },
                  ].map(r => (
                    <div key={r.label} className="flex items-center justify-between">
                      <span className="text-[var(--color-text-muted)]">{r.label}</span>
                      {r.value}
                    </div>
                  ))}
                </div>
              </div>

              {order.affiliate_id && (
                <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 flex items-start gap-2">
                  <BadgeCheck className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-blue-800 leading-relaxed">
                    Purchased through an affiliate referral.
                  </p>
                </div>
              )}
              );
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)]">
                <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                <p className="text-[11px] text-[var(--color-text-muted)]">
                  Your data is protected with end-to-end encryption
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
