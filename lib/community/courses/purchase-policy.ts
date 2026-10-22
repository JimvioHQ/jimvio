export function walletCourseIdempotencyKey(userId: string, courseId: string): string {
  return `CRS-WALLET-${userId}-${courseId}`;
}

export function isCoursePurchaseRefundStatus(status: string | null | undefined): boolean {
  const normalized = String(status || "").toLowerCase();
  return (
    normalized === "refunded" ||
    normalized === "reversed" ||
    normalized === "chargeback" ||
    normalized.includes("refund")
  );
}

/**
 * Decide whether a confirmation replay should grant, keep, or deny access.
 * Receipts from a later-refunded payment must not restore access.
 */
export function coursePurchaseConfirmDecision(input: {
  txStatus: string;
  hasReceipt: boolean;
}): "grant" | "already-granted" | "deny-refund" | "deny-status" {
  if (isCoursePurchaseRefundStatus(input.txStatus)) return "deny-refund";
  const status = input.txStatus.toLowerCase();
  if (status === "failed" || status === "cancelled" || status === "canceled") {
    return "deny-status";
  }
  if (input.hasReceipt && (status === "completed" || status === "paid")) {
    return "already-granted";
  }
  if (status === "pending" || status === "processing" || status === "completed") {
    return "grant";
  }
  return "deny-status";
}
