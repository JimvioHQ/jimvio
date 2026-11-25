export type AffiliateRefundKeyOptions = {
  providerTransactionId?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
};

/** Resolve a stable per-provider refund event key for idempotent affiliate clawbacks. */
export function resolveAffiliateRefundKey(
  orderId: string,
  options: AffiliateRefundKeyOptions,
): string {
  const metadata = options.metadata ?? {};
  const candidate =
    options.providerTransactionId ??
    metadata.refund_id ??
    metadata.refundId ??
    metadata.event_id ??
    metadata.webhook_id ??
    metadata.webhookId ??
    metadata.idempotency_key;
  const stable = candidate == null ? "" : String(candidate).trim();
  return stable
    ? `order:${orderId}:refund:${stable}`
    : `order:${orderId}:refund:${options.notes ?? "status-change"}`;
}
