import Link from "next/link";

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

  const statusLabel = status === "pending" ? "Pending confirmation" : status === "completed" ? "Payment complete" : status === "Processing";
  const details =
    status === "pending"
      ? "Your payment is still being confirmed. Please keep this window open and wait a moment."
      : status === "completed"
      ? "Your payment completed successfully. You can return to checkout or view your order." 
      : "We received an update about your payment. Follow the steps below to continue.";

  return (
    <div className="min-h-screen bg-[var(--color-bg)] py-20 px-4 text-center">
      <div className="mx-auto max-w-xl rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-10 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--color-text-muted)] mb-4">Payment status</p>
        <h1 className="text-3xl font-semibold text-[var(--color-text-primary)] mb-4">{statusLabel}</h1>
        <p className="text-sm leading-7 text-[var(--color-text-secondary)] mb-6">{details}</p>
        {orderId && <p className="text-xs text-[var(--color-text-muted)] mb-6">Order reference: {orderId}</p>}
        <div className="flex flex-col gap-3 sm:flex-row justify-center">
          <Link
            href={orderId ? `/checkout?order=${encodeURIComponent(orderId)}` : "/checkout"}
            className="inline-flex items-center justify-center rounded-full bg-[var(--color-text-primary)] px-6 py-3 text-sm font-semibold text-white hover:opacity-90 transition"
          >
            Continue checkout
          </Link>
          <Link
            href="/orders"
            className="inline-flex items-center justify-center rounded-full border border-[var(--color-border)] bg-transparent px-6 py-3 text-sm font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)] transition"
          >
            View orders
          </Link>
        </div>
      </div>
    </div>
  );
}
