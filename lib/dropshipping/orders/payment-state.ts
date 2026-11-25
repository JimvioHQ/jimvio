export type ExternalPaymentStatus =
  | "paid"
  | "pending"
  | "failed"
  | "refunded"
  | "cancelled";

export type ExistingExternalOrderPaymentState = {
  payment_status?: string | null;
  status?: string | null;
  fulfillment_status_normalized?: string | null;
  cj_order_id?: string | null;
};

/**
 * Build a monotonic payment-state update for an external order.
 * Pending/stale events never downgrade a captured payment, and terminal
 * fulfillment states are not reopened by a late payment event.
 */
export function buildExternalOrderPaymentPatch(
  existing: ExistingExternalOrderPaymentState,
  incomingPaymentStatus: ExternalPaymentStatus,
  isCancelled: boolean,
  now: string
): Record<string, unknown> {
  const currentPayment = String(existing.payment_status ?? "pending").toLowerCase();
  const currentStatus = String(existing.status ?? "pending").toLowerCase();
  const patch: Record<string, unknown> = {};
  const alreadyFulfilled =
    Boolean(existing.cj_order_id) ||
    ["processing", "shipped", "delivered", "completed"].includes(currentStatus);

  if (
    incomingPaymentStatus === "paid" &&
    !["paid", "completed", "refunded"].includes(currentPayment) &&
    !["cancelled", "refunded"].includes(currentStatus)
  ) {
    patch.payment_status = "paid";
    patch.paid_at = now;
    if (isCancelled && !alreadyFulfilled) patch.status = "cancelled";
    else if (currentStatus === "pending") patch.status = "confirmed";
  } else if (incomingPaymentStatus === "refunded") {
    patch.payment_status = "refunded";
    if (!alreadyFulfilled) patch.status = "refunded";
  } else if (incomingPaymentStatus === "cancelled" || isCancelled) {
    if (!["refunded", "cancelled"].includes(currentPayment)) {
      if (!["paid", "completed"].includes(currentPayment)) {
        patch.payment_status = "cancelled";
      }
      if (!alreadyFulfilled) patch.status = "cancelled";
    }
  } else if (incomingPaymentStatus === "failed") {
    if (!["paid", "completed", "refunded"].includes(currentPayment)) {
      patch.payment_status = "failed";
      if (!alreadyFulfilled) patch.status = "cancelled";
    }
  }

  if (Object.keys(patch).length > 0) patch.updated_at = now;
  return patch;
}
