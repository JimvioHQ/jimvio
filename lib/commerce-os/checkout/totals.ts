import type { SupabaseClient } from "@supabase/supabase-js";
import { computeOrderTotalAmount, roundMoney } from "@/lib/commerce/order-totals";
import { applyStoreDiscount, estimateTax, type DiscountRow } from "../discounts/engine";
import { getStoreShippingQuotes } from "../shipping/zones";
import { selectAuthoritativeShipping } from "../shipping/validate";
import { cosTable } from "../db";

export type StoreCheckoutTotalsInput = {
  storeId: string;
  subtotal: number;
  countryCode: string;
  /** Client-proposed shipping — accepted only if it matches a store quote */
  proposedShippingAmount?: number;
  /** Coupon code from checkout (server-validated) */
  discountCode?: string | null;
  fulfillment?: "merchant" | "supplier" | "digital";
  /** Amount already verified against a signed supplier quote. */
  verifiedSupplierShipping?: number | null;
};

export type StoreCheckoutTotals = {
  subtotal: number;
  discountAmount: number;
  shippingAmount: number;
  taxAmount: number;
  totalAmount: number;
  freeShipping: boolean;
  discountId: string | null;
  discountLabel: string | null;
  taxRate: number | null;
  shippingSource: "store" | "supplier" | "none";
};

/**
 * Server-authoritative totals for Jimvio Store checkout.
 * Client amounts are never trusted for discounts/tax; shipping is matched to quotes.
 */
export async function resolveJimvioStoreCheckoutTotals(
  db: SupabaseClient,
  input: StoreCheckoutTotalsInput
): Promise<StoreCheckoutTotals> {
  const subtotal = Math.max(0, roundMoney(Number(input.subtotal) || 0));
  const country = (input.countryCode || "").toUpperCase();

  let discountAmount = 0;
  let freeShipping = false;
  let discountId: string | null = null;
  let discountLabel: string | null = null;

  // Automatic discounts first
  const { data: automatic } = await cosTable(db, "jimvio_store_discounts")
    .select("*")
    .eq("store_id", input.storeId)
    .eq("is_active", true)
    .eq("is_automatic", true)
    .limit(5);

  for (const row of automatic ?? []) {
    const applied = applyStoreDiscount(row as DiscountRow, subtotal, 0);
    if (applied.ok) {
      discountAmount = Math.max(discountAmount, applied.discountAmount);
      if (applied.freeShipping) freeShipping = true;
      discountId = applied.discountId;
      discountLabel = applied.label;
    }
  }

  // Coupon code (overrides / stacks only if larger — keep simple: replace auto if code valid)
  const code = input.discountCode?.trim().toUpperCase();
  if (code) {
    const { data: discountRows } = await cosTable(db, "jimvio_store_discounts")
      .select("*")
      .eq("store_id", input.storeId)
      .eq("is_active", true)
      .limit(50);

    const byCode = (discountRows ?? []).find(
      (row: { code?: string | null }) =>
        (row.code || "").trim().toUpperCase() === code
    );

    if (byCode) {
      const applied = applyStoreDiscount(byCode as DiscountRow, subtotal, 0);
      if (!applied.ok) {
        throw new Error(applied.error);
      }
      discountAmount = applied.discountAmount;
      freeShipping = applied.freeShipping || freeShipping;
      discountId = applied.discountId;
      discountLabel = applied.label;
    } else {
      throw new Error("This discount code is not valid for this store.");
    }
  }

  // Shipping quotes. Supplier-fulfilled orders use the verified supplier quote
  // only — a store flat rate is not added on top of that quote.
  let shippingAmount = 0;
  let shippingSource: StoreCheckoutTotals["shippingSource"] = "none";
  const fulfillment = input.fulfillment ?? "merchant";
  const quotes =
    fulfillment === "supplier" || fulfillment === "digital"
      ? []
      : await getStoreShippingQuotes(db, input.storeId, country, subtotal);

  const choice = selectAuthoritativeShipping({
    fulfillment,
    quotes,
    proposed: input.proposedShippingAmount,
    verifiedSupplierShipping: input.verifiedSupplierShipping,
  });
  if (choice.error) throw new Error(choice.error);
  shippingAmount = choice.amount;
  shippingSource = choice.source;

  if (freeShipping) shippingAmount = 0;

  // Tax from store rules
  let taxAmount = 0;
  let taxRate: number | null = null;
  const { data: taxRules } = await cosTable(db, "jimvio_tax_rules")
    .select("rate_percent, inclusive, country_code, is_active")
    .eq("store_id", input.storeId)
    .eq("is_active", true);

  const matched =
    (taxRules ?? []).find(
      (r: { country_code: string | null }) =>
        r.country_code && r.country_code.toUpperCase() === country
    ) ||
    (taxRules ?? []).find(
      (r: { country_code: string | null }) => !r.country_code
    );

  if (matched) {
    taxRate = Number(matched.rate_percent) || 0;
    const taxableBase = Math.max(0, subtotal - discountAmount);
    const est = estimateTax({
      subtotal: taxableBase,
      ratePercent: taxRate,
      inclusive: Boolean(matched.inclusive),
    });
    taxAmount = est.taxAmount;
  }

  const totalAmount = computeOrderTotalAmount({
    subtotal,
    discount_amount: discountAmount,
    shipping_amount: shippingAmount,
    tax_amount: taxAmount,
  });

  return {
    subtotal,
    discountAmount: roundMoney(discountAmount),
    shippingAmount: roundMoney(shippingAmount),
    taxAmount: roundMoney(taxAmount),
    totalAmount,
    freeShipping,
    discountId,
    discountLabel,
    taxRate,
    shippingSource,
  };
}
