"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function CommerceOrderActions({
  storeId,
  orderId,
  paymentStatus,
  fulfillmentStatus,
  hasTracking,
}: {
  storeId: string;
  orderId: string;
  paymentStatus: string | null;
  fulfillmentStatus: string | null;
  hasTracking: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const pay = (paymentStatus || "").toLowerCase();
  const st = (fulfillmentStatus || "").toLowerCase();
  const canCancel =
    !["paid", "completed", "success", "refunded"].includes(pay) &&
    !["shipped", "delivered", "cancelled", "refunded"].includes(st) &&
    !hasTracking;
  const canRefund =
    ["paid", "completed", "success"].includes(pay) &&
    !["refunded"].includes(pay) &&
    !["refunded"].includes(st);

  async function cancelOrder() {
    if (!window.confirm("Cancel order?\n\nThis cannot be undone.")) return;
    setError(null);
    setMessage(null);
    const res = await fetch("/api/commerce/orders/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeId, orderId }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof json.error === "string" ? json.error : "Cancel failed.");
      return;
    }
    setMessage("Order cancelled.");
    startTransition(() => router.refresh());
  }

  async function refundOrder() {
    if (
      !window.confirm(
        "Refund this order?\n\nThe payment provider must confirm before the order is marked refunded.",
      )
    ) {
      return;
    }
    setError(null);
    setMessage(null);
    const res = await fetch("/api/commerce/orders/refund", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeId, orderId }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof json.error === "string" ? json.error : "Refund failed.");
      return;
    }
    setMessage("Refund confirmed by provider.");
    startTransition(() => router.refresh());
  }

  if (!canCancel && !canRefund) return null;

  return (
    <div className="space-y-2 rounded-xl border border-[#E5E7EB] bg-white p-4">
      <p className="text-sm font-semibold text-[#111827]">Actions</p>
      <div className="flex flex-wrap gap-2">
        {canCancel ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => void cancelOrder()}
            className="rounded-lg border border-[#E5E7EB] px-3 py-2 text-xs font-semibold text-[#374151] disabled:opacity-50"
          >
            Cancel order
          </button>
        ) : null}
        {canRefund ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => void refundOrder()}
            className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            Refund
          </button>
        ) : null}
      </div>
      {message ? (
        <p className="text-sm text-emerald-700" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
