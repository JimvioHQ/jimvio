"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OrderSummary, type OrderSummaryItem } from "@/components/checkout/OrderSummary";
import { NOWPAYMENTS_INVOICE_URL_STORAGE_KEY } from "@/lib/nowpayments-invoice-bridge";

export function CryptoInvoiceBridge({
  orderNumber,
  vendorName,
  items,
  subtotal,
  total,
  currency,
}: {
  orderNumber: string | null;
  vendorName: string | null;
  items: OrderSummaryItem[];
  subtotal: number;
  total: number;
  currency: string;
}) {
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);

  useEffect(() => {
    try {
      const url = sessionStorage.getItem(NOWPAYMENTS_INVOICE_URL_STORAGE_KEY);
      setInvoiceUrl(url && url.startsWith("http") ? url : null);
    } catch {
      setInvoiceUrl(null);
    }
  }, []);

  function openPayment() {
    if (!invoiceUrl) return;
    sessionStorage.removeItem(NOWPAYMENTS_INVOICE_URL_STORAGE_KEY);
    window.location.href = invoiceUrl;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-accent)] mb-2">
          Crypto payment
        </p>
        <h1 className="text-2xl sm:text-3xl font-black text-[var(--color-text-primary)] tracking-tight">
          You&apos;re paying for this order
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-2">
          Review what you&apos;re buying, then continue to the secure NOWPayments page to send crypto.
          {vendorName ? (
            <>
              {" "}
              <span className="font-semibold text-[var(--color-text-primary)]">{vendorName}</span>
            </>
          ) : null}
          {orderNumber ? (
            <>
              {" "}
              · Order <span className="font-mono font-semibold">{orderNumber}</span>
            </>
          ) : null}
        </p>
      </div>

      <OrderSummary items={items} subtotal={subtotal} total={total} currency={currency} />

      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-accent-light)]/30 p-5">
        <div className="flex gap-3">
          <ShieldCheck className="h-5 w-5 shrink-0 text-[var(--color-accent)] mt-0.5" />
          <div className="text-sm text-[var(--color-text-secondary)] space-y-2">
            <p>
              The next screen is hosted by NOWPayments. Your line items are also summarized in the payment
              description when supported.
            </p>
            {!invoiceUrl && (
              <p className="text-amber-800 font-medium">
                Payment link not found in this browser session. Return to checkout and choose crypto again, or
                open checkout in the same tab from &quot;Complete order&quot;.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          type="button"
          size="xl"
          className="flex-1 bg-gradient-to-r from-[var(--color-bg-dark)] to-[var(--color-text-primary)] text-white"
          disabled={!invoiceUrl}
          onClick={() => openPayment()}
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Continue to payment page
        </Button>
        <Button type="button" variant="outline" size="xl" asChild className="sm:w-auto">
          <Link href="/checkout">Back to checkout</Link>
        </Button>
      </div>
    </div>
  );
}
