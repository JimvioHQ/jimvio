/**
 * Tax estimation hooks for checkout.
 * Returns 0 by default until a tax provider is configured.
 * Wire a provider here without changing checkout UI.
 */

export type TaxEstimateInput = {
  subtotal: number;
  shippingAmount?: number;
  countryCode?: string | null;
  currency?: string | null;
  isDigital?: boolean;
};

export type TaxEstimateResult = {
  taxAmount: number;
  taxRate: number | null;
  provider: "none" | "manual" | "external";
};

export function estimateOrderTax(input: TaxEstimateInput): TaxEstimateResult {
  void input;
  // Hook point: plug Avalara / TaxJar / local rates here.
  return { taxAmount: 0, taxRate: null, provider: "none" };
}
