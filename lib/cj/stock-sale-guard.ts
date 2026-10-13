/** How long a successful supplier stock check may be reused. */
export const CJ_STOCK_FRESH_MS = 12 * 60 * 60 * 1000;

export type CjStockSaleInput = {
  requestedQty: number;
  /** Null means the supplier quantity was not confirmed. */
  available: number | null;
  checkedAt: string | null;
  syncStatus?: string | null;
  nowMs?: number;
  freshMs?: number;
};

export type CjStockSaleDecision =
  | { ok: true; available: number }
  | { ok: false; reason: "failed" | "unconfirmed" | "stale" | "insufficient" };

/**
 * Missing, failed, or stale supplier stock is not treated as available.
 * Shipping and price are not part of this decision.
 */
export function decideCjStockSale(input: CjStockSaleInput): CjStockSaleDecision {
  if (input.syncStatus === "failed" || input.syncStatus === "partial_failure") {
    return { ok: false, reason: "failed" };
  }
  if (!input.checkedAt) return { ok: false, reason: "unconfirmed" };
  const checkedMs = Date.parse(input.checkedAt);
  if (!Number.isFinite(checkedMs)) return { ok: false, reason: "unconfirmed" };
  const now = input.nowMs ?? Date.now();
  const freshMs = input.freshMs ?? CJ_STOCK_FRESH_MS;
  if (now - checkedMs > freshMs) return { ok: false, reason: "stale" };
  if (input.available == null || !Number.isFinite(input.available)) {
    return { ok: false, reason: "unconfirmed" };
  }
  const available = Math.max(0, Math.floor(input.available));
  if (!Number.isInteger(input.requestedQty) || input.requestedQty < 1 || available < input.requestedQty) {
    return { ok: false, reason: "insufficient" };
  }
  return { ok: true, available };
}

export function cjStockSaleMessage(name: string, decision: CjStockSaleDecision): string | null {
  if (decision.ok) return null;
  if (decision.reason === "insufficient") return `"${name}" does not have enough supplier stock`;
  if (decision.reason === "stale") return `"${name}" needs a fresh supplier stock check`;
  if (decision.reason === "failed") return `"${name}" could not be confirmed with the supplier`;
  return `"${name}" is not available until supplier stock is confirmed`;
}
