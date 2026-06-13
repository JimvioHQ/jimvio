import { computeOrderEconomics } from "@/lib/pricing/net-profit";
import { rwfToUsdAmount, usdToRwfAmount } from "@/lib/money";

/** Terminal payment statuses — treat both legacy and current values as paid. */
export const PAYMENT_COMPLETE_STATUSES = new Set(["paid", "completed"]);

export function isOrderPaymentComplete(
  paymentStatus: string | null | undefined
): boolean {
  return paymentStatus != null && PAYMENT_COMPLETE_STATUSES.has(paymentStatus);
}

/** True when the buyer still needs to pay (excludes free and cancelled orders). */
export function orderNeedsPayment(
  paymentStatus: string | null | undefined,
  orderStatus: string | null | undefined,
  totalAmount = 0
): boolean {
  if (orderStatus === "cancelled") return false;
  if (Number(totalAmount) === 0) return false;
  return !isOrderPaymentComplete(paymentStatus);
}

/** Avoid showing fulfillment "pending" when payment is already complete. */
export function displayFulfillmentStatus(
  orderStatus: string | null | undefined,
  paymentStatus: string | null | undefined
): string {
  const status = (orderStatus ?? "pending").toLowerCase();
  if (isOrderPaymentComplete(paymentStatus) && status === "pending") {
    return "confirmed";
  }
  return orderStatus ?? "pending";
}

export type PaymentSnapshot = {
  original_amount: number;
  original_currency: string;
  payment_amount: number;
  payment_currency: string;
  exchange_rate: number | null;
  saved_at: string;
};

type PaymentTxLike = {
  type?: string | null;
  status?: string | null;
  amount?: number | string | null;
  currency?: string | null;
  exchange_rate?: number | string | null;
  metadata?: unknown;
};

/** Single source for the amount/currency actually charged at checkout. */
export function resolveChargedPayment(params: {
  orderTotal: number;
  orderCurrency: string;
  transactions?: PaymentTxLike[];
  paymentSnapshot?: PaymentSnapshot | null;
}): { amount: number; currency: string; exchangeRate: number | null } {
  const txs = params.transactions ?? [];
  const paymentTx =
    txs.find((t) => t.type === "payment" && t.status === "completed") ??
    txs.find((t) => t.type === "payment" && t.status === "pending");

  if (paymentTx?.amount != null && paymentTx.currency) {
    const meta =
      paymentTx.metadata && typeof paymentTx.metadata === "object" && !Array.isArray(paymentTx.metadata)
        ? (paymentTx.metadata as { payment_snapshot?: PaymentSnapshot })
        : null;
    return {
      amount: Number(paymentTx.amount),
      currency: String(paymentTx.currency).toUpperCase(),
      exchangeRate:
        paymentTx.exchange_rate != null
          ? Number(paymentTx.exchange_rate)
          : meta?.payment_snapshot?.exchange_rate ?? params.paymentSnapshot?.exchange_rate ?? null,
    };
  }

  if (params.paymentSnapshot) {
    return {
      amount: params.paymentSnapshot.payment_amount,
      currency: params.paymentSnapshot.payment_currency,
      exchangeRate: params.paymentSnapshot.exchange_rate,
    };
  }

  return {
    amount: params.orderTotal,
    currency: (params.orderCurrency || "USD").toUpperCase(),
    exchangeRate: null,
  };
}

export function buildPaymentSnapshot(params: {
  orderTotal: number;
  orderCurrency: string;
  paymentAmount: number;
  paymentCurrency: string;
  exchangeRate: number | null;
}): PaymentSnapshot {
  return {
    original_amount: params.orderTotal,
    original_currency: params.orderCurrency.toUpperCase(),
    payment_amount: params.paymentAmount,
    payment_currency: params.paymentCurrency.toUpperCase(),
    exchange_rate: params.exchangeRate,
    saved_at: new Date().toISOString(),
  };
}

/** Convert order-local amount to USD for economics. */
export function orderAmountToUsd(
  amount: number,
  currency: string | null | undefined,
  exchangeRate?: number | null
): number {
  const c = (currency ?? "USD").toUpperCase();
  if (!Number.isFinite(amount)) return 0;
  if (c === "USD") return amount;
  if (c === "RWF") return rwfToUsdAmount(amount);
  if (exchangeRate && exchangeRate > 0) return amount / exchangeRate;
  return amount;
}

export type OrderEconomicsBreakdown = {
  customerPaid: number;
  customerPaidCurrency: string;
  supplierCost: number;
  shippingCost: number;
  paymentFee: number;
  platformProfit: number;
  vendorEarnings: number;
  currency: string;
};

type OrderItemLike = {
  quantity?: number | null;
  total_price?: number | string | null;
  product_source?: string | null;
  source_metadata?: Record<string, unknown> | null;
};

export function sumSupplierCostUsd(items: OrderItemLike[]): number {
  return items.reduce((sum, item) => {
    const meta = item.source_metadata ?? {};
    const unitCost =
      Number(meta.price_usd ?? meta.cost_usd ?? meta.cost_price ?? meta.cj_cost ?? 0) || 0;
    const qty = Number(item.quantity ?? 1) || 1;
    return sum + unitCost * qty;
  }, 0);
}

/**
 * Profit = Customer Paid - Supplier Cost - Shipping Cost - Payment Fees
 * (computed in order currency for display; uses USD economics internally when needed)
 */
export function computeOrderEconomicsBreakdown(params: {
  totalAmount: number;
  currency: string;
  shippingAmount?: number | null;
  cjShippingCostUsd?: number | null;
  paymentProvider?: string | null;
  exchangeRate?: number | null;
  items?: OrderItemLike[];
  vendorEarnings?: number;
}): OrderEconomicsBreakdown {
  const currency = (params.currency || "USD").toUpperCase();
  const customerPaid = Number(params.totalAmount) || 0;

  const supplierCostUsd = sumSupplierCostUsd(params.items ?? []);
  const shippingCostUsd = Number(params.cjShippingCostUsd ?? 0) || 0;

  const sellPriceUsd = orderAmountToUsd(customerPaid, currency, params.exchangeRate);
  const shippingUsd =
    shippingCostUsd > 0
      ? shippingCostUsd
      : orderAmountToUsd(Number(params.shippingAmount ?? 0), currency, params.exchangeRate);

  const gateway = (params.paymentProvider ?? "flutterwave").toLowerCase();
  const economics = computeOrderEconomics({
    sellPriceUSD: sellPriceUsd,
    productCostUSD: supplierCostUsd,
    shippingCostUSD: shippingUsd,
    gateway,
  });

  const toLocal = (usd: number) => {
    if (currency === "USD") return usd;
    if (currency === "RWF") return usdToRwfAmount(usd);
    if (params.exchangeRate && params.exchangeRate > 0) return usd * params.exchangeRate;
    return usd;
  };

  const vendorEarnings = params.vendorEarnings ?? 0;

  return {
    customerPaid,
    customerPaidCurrency: currency,
    supplierCost: round2(toLocal(supplierCostUsd)),
    shippingCost: round2(toLocal(shippingUsd)),
    paymentFee: round2(toLocal(economics.gatewayFeeUSD)),
    platformProfit: round2(toLocal(economics.netProfitUSD)),
    vendorEarnings: round2(vendorEarnings),
    currency,
  };
}

export function paymentAmountsMatch(
  receivedAmount: number,
  receivedCurrency: string,
  expectedAmount: number,
  expectedCurrency: string,
  tolerance = 1
): boolean {
  if (receivedCurrency.toUpperCase() !== expectedCurrency.toUpperCase()) return false;
  return receivedAmount + tolerance >= expectedAmount;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
