export type ManualApprovalInput = {
  confirmedReceived: boolean;
  reason: string;
  externalReference?: string | null;
};

export type ManualApprovalOrder = {
  status: string | null;
  payment_status: string | null;
  total_amount: number | string | null;
};

const AWAITING = new Set(["pending"]);
const BLOCKED_ORDER = new Set(["cancelled", "refunded", "delivered", "completed", "shipped"]);
const BLOCKED_PAYMENT = new Set(["paid", "completed", "refunded", "cancelled", "failed", "processing"]);

export function manualApprovalEligibility(order: ManualApprovalOrder): { ok: true } | { ok: false; error: string } {
  const payment = (order.payment_status ?? "").toLowerCase();
  const status = (order.status ?? "").toLowerCase();
  if (!AWAITING.has(payment) || BLOCKED_PAYMENT.has(payment)) {
    return { ok: false, error: "Only an order that is still awaiting payment can be approved." };
  }
  if (BLOCKED_ORDER.has(status)) {
    return { ok: false, error: "This order is not eligible for manual payment approval." };
  }
  if (!(Number(order.total_amount) > 0)) {
    return { ok: false, error: "This order does not have an amount awaiting payment." };
  }
  return { ok: true };
}

export function validateManualApprovalInput(input: ManualApprovalInput): { ok: true; reason: string; reference: string | null } | { ok: false; error: string } {
  if (input.confirmedReceived !== true) {
    return { ok: false, error: "Confirm that the payment was received and verified." };
  }
  const reason = input.reason.replace(/\s+/g, " ").trim();
  if (reason.length < 8) {
    return { ok: false, error: "Enter a short audit reason for this approval." };
  }
  const reference = input.externalReference?.replace(/\s+/g, " ").trim() || null;
  if (reference && reference.length < 3) {
    return { ok: false, error: "The payment reference is too short." };
  }
  return { ok: true, reason, reference };
}

export function manualApprovalTransactionId(orderId: string): string {
  return `manual-approval:${orderId}`;
}
