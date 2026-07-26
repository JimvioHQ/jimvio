/**
 * Server-side order total helpers — keep payment charge in sync with
 * subtotal − discount + shipping + tax.
 */

export type OrderAmountFields = {
  subtotal?: number | string | null;
  discount_amount?: number | string | null;
  shipping_amount?: number | string | null;
  tax_amount?: number | string | null;
};

function toMoney(value: number | string | null | undefined): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Canonical payable total used at checkout and payment initiation. */
export function computeOrderTotalAmount(fields: OrderAmountFields): number {
  const subtotal = Math.max(0, toMoney(fields.subtotal));
  const discount = Math.max(0, toMoney(fields.discount_amount));
  const shipping = Math.max(0, toMoney(fields.shipping_amount));
  const tax = Math.max(0, toMoney(fields.tax_amount));
  return roundMoney(Math.max(0, subtotal - discount + shipping + tax));
}
