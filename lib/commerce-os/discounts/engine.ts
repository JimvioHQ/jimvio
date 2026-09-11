/**
 * Store discount calculator — never allows negative totals.
 */

export type DiscountRow = {
  id: string;
  code: string | null;
  discount_type: "percent" | "fixed" | "free_shipping";
  value: number;
  applies_to: "order" | "products" | "collections" | "shipping";
  min_order_amount: number | null;
  usage_limit: number | null;
  used_count: number;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  is_automatic: boolean;
};

export type DiscountApplication = {
  ok: true;
  discountId: string;
  discountAmount: number;
  freeShipping: boolean;
  label: string;
} | {
  ok: false;
  error: string;
  code: string;
};

export function applyStoreDiscount(
  discount: DiscountRow,
  subtotal: number,
  shippingAmount = 0
): DiscountApplication {
  if (!discount.is_active) {
    return { ok: false, error: "This discount is not active.", code: "INACTIVE" };
  }
  const now = Date.now();
  if (discount.starts_at && Date.parse(discount.starts_at) > now) {
    return { ok: false, error: "This discount is not active yet.", code: "NOT_STARTED" };
  }
  if (discount.ends_at && Date.parse(discount.ends_at) < now) {
    return { ok: false, error: "This discount has expired.", code: "EXPIRED" };
  }
  if (
    discount.usage_limit != null &&
    discount.used_count >= discount.usage_limit
  ) {
    return { ok: false, error: "This discount has reached its usage limit.", code: "LIMIT" };
  }
  if (
    discount.min_order_amount != null &&
    subtotal < Number(discount.min_order_amount)
  ) {
    return {
      ok: false,
      error: `Minimum order amount is ${discount.min_order_amount}.`,
      code: "MIN_ORDER",
    };
  }

  if (discount.discount_type === "free_shipping") {
    return {
      ok: true,
      discountId: discount.id,
      discountAmount: 0,
      freeShipping: true,
      label: "Free shipping",
    };
  }

  let amount = 0;
  if (discount.discount_type === "percent") {
    amount = (subtotal * Number(discount.value)) / 100;
  } else {
    amount = Number(discount.value);
  }

  amount = Math.min(Math.max(0, amount), subtotal);
  amount = Math.round(amount * 100) / 100;

  const totalAfter = subtotal - amount + (shippingAmount > 0 ? shippingAmount : 0);
  if (totalAfter < 0) {
    return { ok: false, error: "Discount would create a negative total.", code: "NEGATIVE" };
  }

  return {
    ok: true,
    discountId: discount.id,
    discountAmount: amount,
    freeShipping: false,
    label: discount.code || "Discount",
  };
}

export function estimateTax(params: {
  subtotal: number;
  ratePercent: number;
  inclusive: boolean;
}): { taxAmount: number; taxableBase: number } {
  const rate = Math.max(0, Number(params.ratePercent) || 0) / 100;
  if (rate <= 0) return { taxAmount: 0, taxableBase: params.subtotal };
  if (params.inclusive) {
    const taxAmount = Math.round(((params.subtotal * rate) / (1 + rate)) * 100) / 100;
    return { taxAmount, taxableBase: params.subtotal };
  }
  const taxAmount = Math.round(params.subtotal * rate * 100) / 100;
  return { taxAmount, taxableBase: params.subtotal };
}
