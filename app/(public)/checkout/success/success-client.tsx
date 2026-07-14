"use client";

import Link from "next/link";
import {  CheckCircle2, Mail, Package, Bell, ArrowRight  } from "lucide-react"
import { VscPackage } from "react-icons/vsc";
import { Button } from "@/components/ui/button";
import { StatusPill, ProviderLogo } from "@/components/ui/admin";
import { formatDisplayMoney, cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { useCartStore } from "@/lib/store/use-cart-store";
import {
  CheckoutResultShell,
  CheckoutResultCard,
} from "@/components/checkout/checkout-result-shell";
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
      return null;
    }
  }
  return null;
}

function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
}) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[var(--color-border)] py-2.5 last:border-0">
      <span className="text-[12px] text-[var(--color-text-muted)]">{label}</span>
      <span
        className={cn(
          "text-[13px] font-semibold text-[var(--color-text-primary)]",
          mono && "font-mono text-[12px]"
        )}
      >
        {value}
      </span>
    </div>
  );
}


const WHATS_NEXT = [
  { icon: Mail, text: "Confirmation email on its way to your inbox." },
  { icon: Package, text: "Seller prepares your order for dispatch." },
  { icon: Bell, text: "Track status updates from your orders page." },
] as const;

export function CheckoutSuccessClient({
  order,
}: {
  order: CheckoutSuccessOrder;
}) {
  const { refreshCart } = useCartStore();
  const [fwTransaction, setFwTransaction] =
    useState<FlutterwaveTransaction | null>(null);

  const latestTx = order.transactions[0] ?? null;
  const provider = latestTx?.provider ?? null;
  const paymentStatus = order.payment_status ?? latestTx?.status ?? "paid";
  const label = String(order.order_number || order.id);
  const currency = order.currency ?? "USD";
  const totalAmount = Number(order.total_amount ?? 0);

  useEffect(() => {
    window.history.replaceState({}, "", `/checkout/success?order=${order.id}`);
    refreshCart().then(() =>
      window.dispatchEvent(new CustomEvent("cart-updated"))
    );

    if ((provider ?? "").toLowerCase() !== "flutterwave") return;
    const sp = new URLSearchParams(window.location.search);
    const transactionId = resolveFlutterwaveTransactionId(sp);
    if (!transactionId) return;

    if (order.payment_status === "pending") {
      fetch(`/api/orders/${order.id}/status`).catch(() => {});
    }

    fetch(`/api/payments/verify/${transactionId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const result = data?.data;
        if (result) setFwTransaction(result.data ?? result);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <CheckoutResultShell>
      <div className="space-y-4">
        {/* Hero */}
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-accent-light)]">
            <CheckCircle2 className="h-7 w-7 text-[var(--color-accent)]" strokeWidth={2} />
          </div>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-[var(--color-text-primary)] sm:text-3xl">
            Payment confirmed
          </h1>
          <p className="mt-2 text-[14px] text-[var(--color-text-muted)]">
            Order{" "}
            <span className="font-semibold text-[var(--color-text-primary)]">
              #{label}
            </span>{" "}
            is in progress.
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <StatusPill
              status={paymentStatus === "paid" ? "paid" : paymentStatus}
              size="md"
            />
            {provider && <ProviderLogo provider={provider} />}
          </div>
        </div>

        {/* Order summary */}
        <CheckoutResultCard accent="success">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
            Order summary
          </p>
          <ul className="divide-y divide-[var(--color-border)]">
            {order.order_items?.map((item) => (
              <li
                key={`${item.product_name}-${item.quantity}`}
                className="flex items-center justify-between gap-3 py-3 first:pt-0"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--color-surface-secondary)] text-[12px] font-bold text-[var(--color-text-primary)]">
                    {item.quantity}
                  </span>
                  <span className="truncate text-[13px] text-[var(--color-text-primary)]">
                    {item.product_name}
                  </span>
                </div>
                <span className="shrink-0 text-[13px] font-semibold tabular-nums text-[var(--color-text-primary)]">
                  {formatDisplayMoney(Number(item.total_price), currency)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center justify-between border-t border-[var(--color-border)] pt-3">
            <span className="text-[14px] font-semibold text-[var(--color-text-primary)]">
              Total paid
            </span>
            <span className="text-lg font-bold tabular-nums text-[var(--color-accent)]">
              {formatDisplayMoney(totalAmount, currency)}
            </span>
          </div>
        </CheckoutResultCard>

        {/* Flutterwave details */}
        {fwTransaction && (
          <CheckoutResultCard>
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                Transaction
              </p>
              <StatusPill
                status={
                  fwTransaction.status === "successful"
                    ? "paid"
                    : fwTransaction.status
                }
                size="sm"
              />
            </div>
            <DetailRow label="Transaction ID" value={String(fwTransaction.id)} mono />
            <DetailRow label="Reference" value={fwTransaction.tx_ref} mono />
            <DetailRow
              label="Amount"
              value={`${fwTransaction.currency} ${Number(
                fwTransaction.charged_amount ?? fwTransaction.amount
              ).toLocaleString()}`}
            />
            <DetailRow label="Customer" value={fwTransaction.customer?.name} />
            {fwTransaction.created_at && (
              <DetailRow
                label="Date"
                value={new Date(fwTransaction.created_at).toLocaleString()}
              />
            )}
          </CheckoutResultCard>
        )}

        {/* What's next */}
        <CheckoutResultCard>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
            What happens next
          </p>
          <ul className="space-y-3">
            {WHATS_NEXT.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-surface-secondary)]">
                  <Icon className="h-4 w-4 text-[var(--color-accent)]" />
                </span>
                <p className="pt-1 text-[13px] leading-relaxed text-[var(--color-text-muted)]">
                  {text}
                </p>
              </li>
            ))}
          </ul>
        </CheckoutResultCard>

        {/* CTAs */}
        <div className="flex flex-col gap-3 pt-2 sm:flex-row">
          <Button
            asChild
            size="lg"
            className="h-11 flex-1 rounded-lg bg-[var(--color-accent)] font-semibold text-white hover:bg-[var(--color-accent-hover)]"
          >
            <Link href={`/orders/${order.id}`}>
              Track order
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="h-11 flex-1 rounded-lg border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)]"
          >
            <Link href="/marketplace">Continue shopping</Link>
          </Button>
        </div>
      </div>
    </CheckoutResultShell>
  );
}
