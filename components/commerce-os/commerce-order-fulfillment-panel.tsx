"use client";

import { useState, useTransition } from "react";
import { markJimvioStoreOrderFulfillment } from "@/lib/commerce-os/fulfillment/mark-store-order";

export function CommerceOrderFulfillmentPanel({
  orderId,
  status,
  paymentStatus,
  trackingNumber,
  isSupplierFulfilled,
}: {
  orderId: string;
  status: string | null;
  paymentStatus: string | null;
  trackingNumber?: string | null;
  /** True when order is handled by the automated supplier fulfillment network. */
  isSupplierFulfilled?: boolean;
}) {
  const [tracking, setTracking] = useState(trackingNumber ?? "");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const paid =
    paymentStatus === "completed" ||
    paymentStatus === "paid" ||
    paymentStatus === "success";

  if (isSupplierFulfilled) {
    return (
      <p className="text-sm text-[#6B7280]">
        This order is handled by Jimvio Fulfillment. Tracking updates appear
        automatically as the shipment progresses.
      </p>
    );
  }

  if (!paid) {
    return (
      <p className="text-sm text-[#6B7280]">
        Fulfillment unlocks after payment is confirmed.
      </p>
    );
  }

  function run(action: "processing" | "ship" | "deliver") {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await markJimvioStoreOrderFulfillment({
        orderId,
        action,
        trackingNumber: tracking,
        trackingUrl: trackingUrl || undefined,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage(`Updated to ${result.status}`);
    });
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-[#4B5563]">
        Status: <span className="font-semibold text-[#111827]">{status || "—"}</span>
        {trackingNumber ? (
          <>
            {" "}
            · Tracking:{" "}
            <span className="font-mono text-xs">{trackingNumber}</span>
          </>
        ) : null}
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={tracking}
          onChange={(e) => setTracking(e.target.value)}
          placeholder="Tracking number"
          className="min-h-11 flex-1 rounded-lg border border-[#E5E7EB] px-3 text-sm"
        />
        <input
          type="url"
          value={trackingUrl}
          onChange={(e) => setTrackingUrl(e.target.value)}
          placeholder="Tracking URL (optional)"
          className="min-h-11 flex-1 rounded-lg border border-[#E5E7EB] px-3 text-sm"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => run("processing")}
          className="min-h-11 rounded-lg border border-[#E5E7EB] px-3 text-xs font-semibold text-[#111827] disabled:opacity-50"
        >
          Mark processing
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => run("ship")}
          className="min-h-11 rounded-lg bg-[#111827] px-3 text-xs font-semibold text-white disabled:opacity-50"
        >
          Mark shipped
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => run("deliver")}
          className="min-h-11 rounded-lg border border-[#E5E7EB] px-3 text-xs font-semibold text-[#111827] disabled:opacity-50"
        >
          Mark delivered
        </button>
      </div>
      {error ? <p className="text-xs font-medium text-red-600">{error}</p> : null}
      {message ? <p className="text-xs font-medium text-emerald-700">{message}</p> : null}
    </div>
  );
}
