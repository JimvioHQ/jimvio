import Link from "next/link";
import { StatusPill } from "@/components/ui/admin";
import {
  CheckoutResultShell,
  CheckoutResultCard,
} from "@/components/checkout/checkout-result-shell";

function getFirstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default function CheckoutStatusPage({
  searchParams,
}: {
  searchParams: {
    status?: string | string[];
    order?: string | string[];
  };
}) {
  const status = (getFirstParam(searchParams.status) ?? "pending").toLowerCase();
  const orderId = getFirstParam(searchParams.order);

  const statusLabel =
    status === "pending"
      ? "Pending confirmation"
      : status === "completed" || status === "paid"
        ? "Payment complete"
        : status === "processing"
          ? "Processing"
          : "Payment update";

  const details =
    status === "pending"
      ? "Your payment is still being confirmed. Keep this page open for a moment."
      : status === "completed" || status === "paid"
        ? "Payment completed. View your order or continue shopping."
        : status === "processing"
          ? "Your order is being processed."
          : "We received a payment update. Use the options below to continue.";

  const pillStatus =
    status === "completed" || status === "paid"
      ? "paid"
      : status === "failed"
        ? "failed"
        : "pending";

  return (
    <CheckoutResultShell>
      <CheckoutResultCard accent={status === "failed" ? "error" : "warning"}>
        <div className="text-center">
          <StatusPill status={pillStatus} size="md" />
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-[var(--color-text-primary)]">
            {statusLabel}
          </h1>
          <p className="mt-2 text-[14px] leading-relaxed text-[var(--color-text-muted)]">
            {details}
          </p>
          {orderId && (
            <p className="mt-4 text-[12px] text-[var(--color-text-muted)]">
              Order ref:{" "}
              <span className="font-mono text-[var(--color-text-primary)]">{orderId}</span>
            </p>
          )}
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href={orderId ? `/orders/${orderId}` : "/orders"}
            className="inline-flex h-10 flex-1 items-center justify-center rounded-lg bg-[var(--color-accent)] text-[13px] font-semibold text-white hover:bg-[var(--color-accent-hover)]"
          >
            View order
          </Link>
          <Link
            href={orderId ? `/checkout?order=${encodeURIComponent(orderId)}` : "/checkout"}
            className="inline-flex h-10 flex-1 items-center justify-center rounded-lg border border-[var(--color-border)] text-[13px] font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)]"
          >
            {status === "pending" ? "Return to checkout" : "Try again"}
          </Link>
        </div>
      </CheckoutResultCard>
    </CheckoutResultShell>
  );
}
