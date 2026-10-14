"use client";

import { useState, useTransition } from "react";
import { approveManualOrderPayment } from "@/lib/payments/approve-manual-payment";

export function ApprovePaymentForm({ orderId }: { orderId: string }) {
  const [pending, startTransition] = useTransition();
  const [confirmed, setConfirmed] = useState(false);
  const [reason, setReason] = useState("");
  const [reference, setReference] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="mt-3 space-y-2"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        setMessage(null);
        startTransition(async () => {
          const result = await approveManualOrderPayment({
            orderId,
            confirmedReceived: confirmed,
            reason,
            externalReference: reference,
          });
          if (!result.ok) {
            setError(result.error ?? "Payment could not be approved.");
            return;
          }
          if (result.supplierError) {
            setMessage(`Payment recorded. ${result.supplierError}`);
            return;
          }
          if (result.supplierSubmitted) {
            setMessage("Payment recorded and the order was submitted for fulfillment.");
            return;
          }
          setMessage(result.alreadyFinalized ? "This payment was already finalized." : "Payment recorded.");
        });
      }}
    >
      <label className="flex items-start gap-2 text-[12px] text-amber-800 dark:text-amber-200">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)}
          className="mt-0.5"
        />
        I verified that this payment was actually received.
      </label>
      <input
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        placeholder="Audit reason"
        className="h-8 w-full max-w-md rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-[12px]"
      />
      <input
        value={reference}
        onChange={(event) => setReference(event.target.value)}
        placeholder="External payment reference, if you have one"
        className="h-8 w-full max-w-md rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-[12px]"
      />
      <button
        type="submit"
        disabled={pending}
        className="h-8 px-3 inline-flex items-center rounded text-[12px] font-medium border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-secondary)] disabled:opacity-60"
      >
        {pending ? "Approving…" : "Approve payment"}
      </button>
      {error ? <p className="text-[12px] text-rose-700">{error}</p> : null}
      {message ? <p className="text-[12px] text-emerald-700">{message}</p> : null}
    </form>
  );
}
