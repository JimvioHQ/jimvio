/**
 * Configurable price rule engine.
 * Never allows negative / invalid selling prices.
 */

export type MarkupType = "percent" | "fixed";
export type RoundingRule = "none" | "nearest_0_99" | "nearest_integer" | "ceil_integer";

export type PriceRuleInput = {
  supplierCost: number;
  shippingCost?: number;
  jimvioMarginPercent?: number;
  markupType: MarkupType;
  markupValue: number;
  minProfit?: number | null;
  maxPrice?: number | null;
  roundingRule?: RoundingRule;
  includeShipping?: boolean;
  currency?: string;
};

export type PriceRuleResult = {
  ok: true;
  sellingPrice: number;
  merchantCost: number;
  currency: string;
  breakdown: {
    supplierCost: number;
    shippingCost: number;
    jimvioMargin: number;
    markupApplied: number;
  };
} | {
  ok: false;
  error: string;
  code: "INVALID_COST" | "INVALID_MARKUP" | "NEGATIVE_PRICE" | "INVALID_MAX";
};

function roundPrice(value: number, rule: RoundingRule): number {
  switch (rule) {
    case "nearest_0_99":
      return Math.max(0.99, Math.round(value) - 0.01);
    case "nearest_integer":
      return Math.round(value);
    case "ceil_integer":
      return Math.ceil(value);
    default:
      return Math.round(value * 100) / 100;
  }
}

export function calculateSellingPrice(input: PriceRuleInput): PriceRuleResult {
  const supplierCost = Number(input.supplierCost);
  const shippingCost = Number(input.shippingCost ?? 0);
  const jimvioMarginPercent = Number(input.jimvioMarginPercent ?? 0);
  const markupValue = Number(input.markupValue);

  if (!Number.isFinite(supplierCost) || supplierCost < 0) {
    return { ok: false, error: "Supplier cost must be a non-negative number.", code: "INVALID_COST" };
  }
  if (!Number.isFinite(shippingCost) || shippingCost < 0) {
    return { ok: false, error: "Shipping cost must be a non-negative number.", code: "INVALID_COST" };
  }
  if (!Number.isFinite(markupValue) || markupValue < 0) {
    return { ok: false, error: "Markup must be a non-negative number.", code: "INVALID_MARKUP" };
  }

  const base =
    supplierCost + (input.includeShipping ? shippingCost : 0);
  const jimvioMargin = base * (jimvioMarginPercent / 100);
  const merchantCost = base + jimvioMargin;

  let markupApplied = 0;
  if (input.markupType === "percent") {
    markupApplied = merchantCost * (markupValue / 100);
  } else {
    markupApplied = markupValue;
  }

  let sellingPrice = merchantCost + markupApplied;

  if (input.minProfit != null && Number.isFinite(input.minProfit)) {
    const minSell = merchantCost + Number(input.minProfit);
    if (sellingPrice < minSell) sellingPrice = minSell;
  }

  if (input.maxPrice != null && Number.isFinite(input.maxPrice)) {
    if (input.maxPrice < 0) {
      return { ok: false, error: "Maximum price cannot be negative.", code: "INVALID_MAX" };
    }
    sellingPrice = Math.min(sellingPrice, Number(input.maxPrice));
  }

  sellingPrice = roundPrice(sellingPrice, input.roundingRule ?? "none");

  if (!Number.isFinite(sellingPrice) || sellingPrice < 0) {
    return {
      ok: false,
      error: "Calculated selling price is invalid.",
      code: "NEGATIVE_PRICE",
    };
  }

  return {
    ok: true,
    sellingPrice,
    merchantCost: Math.round(merchantCost * 100) / 100,
    currency: input.currency ?? "USD",
    breakdown: {
      supplierCost,
      shippingCost,
      jimvioMargin: Math.round(jimvioMargin * 100) / 100,
      markupApplied: Math.round(markupApplied * 100) / 100,
    },
  };
}

/** Available quantity after safety stock — never negative. */
export function availableInventory(
  supplierStock: number,
  safetyStock = 0
): number {
  const stock = Math.max(0, Math.floor(Number(supplierStock) || 0));
  const safety = Math.max(0, Math.floor(Number(safetyStock) || 0));
  return Math.max(0, stock - safety);
}

/**
 * Resolve most specific active rule from a candidate list.
 * Priority: variant > product > store > global, then lower priority number wins.
 */
export type PriceRuleRow = {
  id: string;
  store_id: string | null;
  product_id: string | null;
  variant_id: string | null;
  markup_type: MarkupType;
  markup_value: number;
  min_profit: number | null;
  max_price: number | null;
  rounding_rule: RoundingRule;
  currency: string;
  include_shipping: boolean;
  jimvio_margin_percent: number;
  priority: number;
  is_active: boolean;
  require_approval?: boolean;
  auto_sync?: boolean;
};

export function pickPriceRule(
  rules: PriceRuleRow[],
  ctx: { storeId?: string | null; productId?: string | null; variantId?: string | null }
): PriceRuleRow | null {
  const active = rules.filter((r) => r.is_active);
  const scored = active
    .map((r) => {
      let specificity = 0;
      if (r.variant_id) {
        if (r.variant_id !== ctx.variantId) return null;
        specificity += 400;
      }
      if (r.product_id) {
        if (r.product_id !== ctx.productId) return null;
        specificity += 300;
      }
      if (r.store_id) {
        if (r.store_id !== ctx.storeId) return null;
        specificity += 200;
      }
      if (!r.store_id && !r.product_id && !r.variant_id) specificity += 100;
      return { rule: r, score: specificity * 1000 - r.priority };
    })
    .filter((x): x is { rule: PriceRuleRow; score: number } => x != null)
    .sort((a, b) => b.score - a.score);

  return scored[0]?.rule ?? null;
}
