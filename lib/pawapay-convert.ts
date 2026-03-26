/**
 * Convert order totals into the currency required by a PawaPay MMO provider.
 * USD checkouts can pay in RWF/ZMW using env rates (same idea as PesaPal + RWF_TO_USD_RATE).
 */

import { usdToRwfAmount } from "@/lib/money";

function parsePositive(envVal: string | undefined, fallback: number): number {
  const n = parseFloat(envVal ?? "");
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Zambian Kwacha charged per 1 USD (e.g. 25). Set PAWAPAY_ZMW_PER_USD in production. */
export function getZmwPerUsd(): number {
  return parsePositive(
    typeof process !== "undefined"
      ? process.env.PAWAPAY_ZMW_PER_USD || process.env.NEXT_PUBLIC_PAWAPAY_ZMW_PER_USD
      : undefined,
    25
  );
}

export type PawaPayConversion = {
  amount: number;
  currency: string;
  converted: boolean;
  /** Human-readable note for receipts/UI */
  note: string | null;
};

/**
 * @param orderAmount — order total in `orderCurrency`
 * @param orderCurrency — ISO 4217
 * @param providerCurrency — provider's settlement currency (RWF, ZMW, …)
 */
export function convertOrderToPawaPayCurrency(
  orderAmount: number,
  orderCurrency: string,
  providerCurrency: string
): PawaPayConversion {
  const oc = (orderCurrency || "USD").toUpperCase();
  const pc = providerCurrency.toUpperCase();

  if (!Number.isFinite(orderAmount) || orderAmount <= 0) {
    throw new Error("Invalid order amount");
  }

  if (oc === pc) {
    return {
      amount: orderAmount,
      currency: pc,
      converted: false,
      note: null,
    };
  }

  if (oc === "USD" && pc === "RWF") {
    const rwf = usdToRwfAmount(orderAmount);
    return {
      amount: rwf,
      currency: "RWF",
      converted: true,
      note: `Converted ${orderAmount.toFixed(2)} USD → ${rwf.toLocaleString()} RWF`,
    };
  }

  if (oc === "USD" && pc === "ZMW") {
    const zmw = Math.max(1, Math.round(orderAmount * getZmwPerUsd()));
    return {
      amount: zmw,
      currency: "ZMW",
      converted: true,
      note: `Converted ${orderAmount.toFixed(2)} USD → ${zmw.toLocaleString()} ZMW (PAWAPAY_ZMW_PER_USD=${getZmwPerUsd()})`,
    };
  }

  throw new Error(
    `PawaPay: no conversion from ${oc} to ${pc}. Price in ${pc}, switch order currency, or add a rate / use PesaPal.`
  );
}

/** Client-safe estimate for UI (uses NEXT_PUBLIC_* when set). */
export function estimatePawaPayLocalAmount(
  orderTotal: number,
  orderCurrency: string,
  providerCurrency: string
): { localAmount: number; localCurrency: string; converted: boolean } | null {
  try {
    const r = convertOrderToPawaPayCurrency(orderTotal, orderCurrency, providerCurrency);
    return { localAmount: r.amount, localCurrency: r.currency, converted: r.converted };
  } catch {
    return null;
  }
}
