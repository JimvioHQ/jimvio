// app/checkout/session-expired/page.tsx
"use client";

import { TransactionSessionExpired } from "@/components/payment/transaction-session-expired";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";

/* ── Inner component reads search params ── */
function SessionExpiredInner() {
  const searchParams = useSearchParams();
  const router       = useRouter();

  const orderId  = searchParams.get("order")  ?? undefined;
  const txRef    = searchParams.get("tx_ref") ?? undefined;
  const backHref = searchParams.get("back")   ?? "/checkout";

  /* Re-initiate a fresh Flutterwave payment for the same order */
  async function handleRetry() {
    if (!orderId) {
      router.push("/checkout");
      return;
    }

    const res = await fetch("/api/payments/flutterwave/initiate", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ orderId }),
    });

    if (!res.ok) {
      // Let the component stay mounted — user sees error via support link
      throw new Error("Could not initiate payment");
    }

    const { redirectUrl } = (await res.json()) as { redirectUrl?: string };
    if (redirectUrl) window.location.href = redirectUrl;
  }

  return (
    <TransactionSessionExpired
      orderRef={orderId}
      backHref={backHref}
      onRetry={handleRetry}
    />
  );
}

/* ── Page ── */
export default function SessionExpiredPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--color-bg)" }}>
        <div className="h-5 w-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--color-accent)" }} />
      </div>
    }>
      <SessionExpiredInner />
    </Suspense>
  );
}