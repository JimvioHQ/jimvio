"use client";

import Link from "next/link";
import { Mail, Package, Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDisplayMoney } from "@/lib/utils";
import { useEffect, useState } from "react";
import { useCartStore } from "@/lib/store/use-cart-store";
import type { CheckoutSuccessOrder } from "./page";

interface FlutterwaveTransaction {
  id: number | string;
  amount: number;
  currency: string;
  charged_amount: number;
  payment_type: string;
  created_at: Date;
  tx_ref: string;
  status: string;
  customer: {
    name: string;
    id: string | number;
    phone_number: string;
    email: string;
  };
  meta?: Record<string, unknown>;
}

/* ── Helpers ─────────────────────────────────────────────────────── */

function resolvePaymentMethod(provider: string | null): string {
  const p = (provider ?? "").toLowerCase();
  const map: Record<string, string> = {
    nowpayments: "Crypto",
    pesapal: "PesaPal",
    pawapay: "PawaPay",
    afripay: "AfriPay",
    flutterwave: "Flutterwave",
    paypal: "PayPal",
  };
  return map[p] ?? (p ? p.charAt(0).toUpperCase() + p.slice(1) : "");
}

function resolveOrderLabel(order: CheckoutSuccessOrder): string {
  return String(order.order_number || order.id);
}

function resolveFlutterwaveTransactionId(sp: URLSearchParams): string | null {
  const direct = sp.get("transaction_id");
  if (direct) return direct;

  const resp = sp.get("resp");
  if (resp) {
    try {
      const decoded = JSON.parse(decodeURIComponent(resp));
      const id = decoded?.data?.id;
      return id ? String(id) : null;
    } catch {
      console.error("[Flutterwave] Failed to decode resp param");
    }
  }
  return null;
}

/* ── Animated success SVG ────────────────────────────────────────── */

function SuccessSVG() {
  return (
    <svg
      viewBox="0 0 160 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-36 h-36"
      aria-label="Payment successful"
    >
      <style>{`
        @keyframes ring-grow {
          0%   { r: 0; opacity: 0; }
          60%  { opacity: 0.15; }
          100% { r: 72; opacity: 0; }
        }
        @keyframes circle-pop {
          0%   { transform: scale(0); opacity: 0; }
          60%  { transform: scale(1.08); opacity: 1; }
          80%  { transform: scale(0.96); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes check-draw {
          0%   { stroke-dashoffset: 60; opacity: 0; }
          30%  { opacity: 1; }
          100% { stroke-dashoffset: 0; opacity: 1; }
        }
        @keyframes coin-float   { 0%,100% { transform: translateY(0px)  rotate(-8deg);  } 50% { transform: translateY(-6px)  rotate(-8deg); } }
        @keyframes coin-float-2 { 0%,100% { transform: translateY(0px)  rotate(12deg);  } 50% { transform: translateY(-9px)  rotate(12deg); } }
        @keyframes coin-float-3 { 0%,100% { transform: translateY(0px)  rotate(4deg);   } 50% { transform: translateY(-5px)  rotate(4deg);  } }
        @keyframes sparkle {
          0%   { opacity: 0; transform: scale(0) rotate(0deg); }
          40%  { opacity: 1; transform: scale(1) rotate(180deg); }
          100% { opacity: 0; transform: scale(0.5) rotate(360deg); }
        }
        .ring-pulse   { transform-origin: 80px 80px; animation: ring-grow 1.4s ease-out 0.2s both; }
        .ring-pulse-2 { transform-origin: 80px 80px; animation: ring-grow 1.4s ease-out 0.5s both; }
        .main-circle  { transform-origin: 80px 80px; animation: circle-pop 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.3s both; }
        .check-mark   { stroke-dasharray: 60; stroke-dashoffset: 60; animation: check-draw 0.5s ease-out 0.85s both; }
        .coin-1 { transform-origin: 22px  52px;  animation: sparkle 0.7s ease-out 1.0s  both, coin-float   2.8s ease-in-out 1.7s  infinite; }
        .coin-2 { transform-origin: 138px 48px;  animation: sparkle 0.7s ease-out 1.15s both, coin-float-2 3.2s ease-in-out 1.85s infinite; }
        .coin-3 { transform-origin: 130px 100px; animation: sparkle 0.7s ease-out 1.25s both, coin-float-3 2.6s ease-in-out 1.95s infinite; }
        .sparkle-1 { transform-origin: 36px 32px;  animation: sparkle 0.6s ease-out 1.1s both; }
        .sparkle-2 { transform-origin: 128px 34px; animation: sparkle 0.6s ease-out 1.3s both; }
        .sparkle-3 { transform-origin: 32px 118px; animation: sparkle 0.6s ease-out 1.2s both; }
      `}</style>

      <circle cx="80" cy="80" r="0" fill="#22c55e" className="ring-pulse" />
      <circle cx="80" cy="80" r="0" fill="#22c55e" className="ring-pulse-2" />
      <circle cx="80" cy="80" r="68" fill="#f0fdf4" className="main-circle" />
      <circle cx="80" cy="80" r="54" fill="#22c55e" className="main-circle" />
      <circle cx="80" cy="80" r="52" stroke="#4ade80" strokeWidth="2" fill="none" className="main-circle" />

      <polyline
        points="56,80 72,96 106,64"
        stroke="white"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        className="check-mark"
      />

      <g className="coin-1">
        <circle cx="22" cy="52" r="11" fill="#fbbf24" />
        <circle cx="22" cy="52" r="9" fill="#f59e0b" />
        <text x="22" y="56" textAnchor="middle" fill="#78350f" fontSize="9" fontWeight="700">$</text>
      </g>
      <g className="coin-2">
        <circle cx="138" cy="48" r="9" fill="#fbbf24" />
        <circle cx="138" cy="48" r="7" fill="#f59e0b" />
        <text x="138" y="52" textAnchor="middle" fill="#78350f" fontSize="8" fontWeight="700">$</text>
      </g>
      <g className="coin-3">
        <circle cx="130" cy="100" r="10" fill="#fbbf24" />
        <circle cx="130" cy="100" r="8" fill="#f59e0b" />
        <text x="130" y="104" textAnchor="middle" fill="#78350f" fontSize="8" fontWeight="700">$</text>
      </g>

      <g className="sparkle-1">
        <line x1="36" y1="28" x2="36" y2="36" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="32" y1="32" x2="40" y2="32" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" />
      </g>
      <g className="sparkle-2">
        <line x1="128" y1="30" x2="128" y2="38" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
        <line x1="124" y1="34" x2="132" y2="34" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
      </g>
      <g className="sparkle-3">
        <line x1="32" y1="114" x2="32" y2="122" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" />
        <line x1="28" y1="118" x2="36" y2="118" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" />
      </g>
    </svg>
  );
}

/* ── Sub-components ──────────────────────────────────────────────── */

function DetailRow({
  label,
  value,
  mono = false,
  accent = false,
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
  accent?: boolean;
}) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-[var(--color-border)] last:border-0">
      <span className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wide font-medium">
        {label}
      </span>
      <span
        className={`text-sm font-semibold ${mono ? "font-mono" : ""} ${
          accent
            ? "text-green-600 dark:text-green-500"
            : "text-[var(--color-text-primary)]"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    successful: {
      label: "Successful",
      cls: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    },
    completed: {
      label: "Completed",
      cls: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    },
    paid: {
      label: "Paid",
      cls: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    },
    pending: {
      label: "Pending",
      cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    },
    failed: {
      label: "Failed",
      cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    },
  };
  const s = map[status.toLowerCase()] ?? {
    label: status,
    cls: "bg-gray-100 text-gray-600",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${s.cls}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {s.label}
    </span>
  );
}

const WHATS_NEXT_STEPS = [
  { icon: Mail, text: "A confirmation email will be sent to you shortly." },
  { icon: Package, text: "Your order will be prepared and dispatched." },
  { icon: Bell, text: "You'll receive updates on your order status." },
] as const;

/* ── Main component ──────────────────────────────────────────────── */

export function CheckoutSuccessClient({
  order,
}: {
  order: CheckoutSuccessOrder;
}) {
  const { refreshCart } = useCartStore();
  const [fwTransaction, setFwTransaction] =
    useState<FlutterwaveTransaction | null>(null);

  // Derive provider/status from the transactions array, not from `order` directly.
  // Schema: `orders` has no `payment_provider` column — that lives on `transactions`.
  const latestTx = order.transactions[0] ?? null;
  const provider = latestTx?.provider ?? null;

  useEffect(() => {
    window.history.replaceState({}, "", `/checkout/success?order=${order.id}`);

    refreshCart().then(() =>
      window.dispatchEvent(new CustomEvent("cart-updated")),
    );

    if ((provider ?? "").toLowerCase() !== "flutterwave") return;

    const sp = new URLSearchParams(window.location.search);
    const transactionId = resolveFlutterwaveTransactionId(sp);
    if (!transactionId) return;

    if (order.payment_status === "pending") {
      fetch(`/api/orders/${order.id}/status`).catch((err) =>
        console.error("[Flutterwave status check error]", err),
      );
    }

    fetch(`/api/payments/verify/${transactionId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const result = data?.data;
        if (result) setFwTransaction(result.data ?? result);
      })
      .catch((err) => console.error("[Flutterwave detail fetch]", err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const label = resolveOrderLabel(order);
  const method = resolvePaymentMethod(
    provider ?? fwTransaction?.payment_type ?? null,
  );
  const totalAmount = Number(order.total_amount ?? 0);
  const currency = order.currency ?? "USD";

  return (
    <>
      <style>{`
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .anim-1 { animation: slide-up 0.5s ease-out 0.1s  both; }
        .anim-2 { animation: slide-up 0.5s ease-out 0.25s both; }
        .anim-3 { animation: slide-up 0.5s ease-out 0.4s  both; }
        .anim-4 { animation: slide-up 0.5s ease-out 0.55s both; }
        .anim-5 { animation: slide-up 0.5s ease-out 0.7s  both; }
      `}</style>

      <div className="max-w-lg mx-auto px-4 pb-12">
        {/* Hero */}
        <div className="flex flex-col items-center text-center pt-6 pb-2 anim-1">
          <SuccessSVG />
          <h1 className="mt-4 text-2xl sm:text-3xl font-bold text-[var(--color-text-primary)]">
            Payment successful!
          </h1>
          <p className="mt-1.5 text-sm text-[var(--color-text-secondary)]">
            Your order{" "}
            <span className="font-semibold text-green-500">#{label}</span> is
            confirmed and being processed.
          </p>
        </div>

        {/* Flutterwave transaction details */}
        {fwTransaction && (
          <div className="mt-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-background-primary)] overflow-hidden anim-2">
            <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
                Transaction details
              </span>
              {fwTransaction.status && (
                <StatusBadge status={fwTransaction.status} />
              )}
            </div>
            <div className="px-4 divide-y divide-[var(--color-border)]">
              <DetailRow
                label="Transaction ID"
                value={String(fwTransaction.id)}
                mono
              />
              <DetailRow label="Reference" value={fwTransaction.tx_ref} mono />
              <DetailRow
                label="Amount"
                value={`${fwTransaction.currency} ${Number(
                  fwTransaction.charged_amount ?? fwTransaction.amount,
                ).toLocaleString()}`}
                accent
              />
              <DetailRow
                label="Payment method"
                value={fwTransaction.payment_type
                  ?.replace(/_/g, " ")
                  .replace(/\b\w/g, (c) => c.toUpperCase())}
              />
              <DetailRow label="Customer" value={fwTransaction.customer?.name} />
              <DetailRow label="Email" value={fwTransaction.customer?.email} />
              {fwTransaction.created_at && (
                <DetailRow
                  label="Date"
                  value={new Date(fwTransaction.created_at).toLocaleString()}
                />
              )}
            </div>
          </div>
        )}

        {/* Order summary */}
        <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-background-primary)] overflow-hidden anim-3">
          <div className="px-4 py-3 border-b border-[var(--color-border)]">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
              Order summary
            </span>
          </div>

          <ul className="divide-y divide-[var(--color-border)]">
            {order.order_items?.map((item) => (
              <li
                key={item.product_name + item.quantity}
                className="flex items-center justify-between px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-md bg-green-50 dark:bg-green-950/20 flex items-center justify-center text-green-600 dark:text-green-500 text-xs font-bold">
                    {item.quantity}
                  </div>
                  <span className="text-sm text-[var(--color-text-primary)] max-w-[200px] truncate">
                    {item.product_name}
                  </span>
                </div>
                <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                  {formatDisplayMoney(Number(item.total_price), currency)}
                </span>
              </li>
            ))}
          </ul>

          <div className="px-4 py-3 border-t border-[var(--color-border)] bg-[var(--color-background-secondary)] flex items-center justify-between">
            <span className="text-sm font-semibold text-[var(--color-text-primary)]">
              Total paid
            </span>
            <div className="flex items-center gap-2">
              {method && (
                <Badge variant="outline" className="text-xs">
                  {method}
                </Badge>
              )}
              <span className="text-base font-bold text-green-600 dark:text-green-500">
                {formatDisplayMoney(totalAmount, currency)}
              </span>
            </div>
          </div>
        </div>

        {/* What's next */}
        <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-background-primary)] px-4 py-4 anim-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-3">
            What's next
          </p>
          <div className="space-y-3">
            {WHATS_NEXT_STEPS.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-start gap-3">
                <div className="mt-0.5 w-7 h-7 rounded-md bg-green-50 dark:bg-green-950/20 flex items-center justify-center shrink-0">
                  <Icon className="w-3.5 h-3.5 text-green-600 dark:text-green-500" />
                </div>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {text}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* CTAs */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3 anim-5">
          <Button
            asChild
            size="lg"
            className="flex-1 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold"
          >
            <Link href={`/orders/${order.id}`}>Track my order</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="flex-1 rounded-xl">
            <Link href="/products">Continue shopping</Link>
          </Button>
        </div>
      </div>
    </>
  );
}