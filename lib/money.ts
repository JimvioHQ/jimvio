/**
 * Server-side money helpers. Uses RWF_TO_USD_RATE (1 RWF = rate USD).
 */

function parseRate(envVal: string | undefined, fallback: number): number {
  const n = parseFloat(envVal ?? "")
  return Number.isFinite(n) && n > 0 ? n : fallback
}

/** 1 RWF = rate USD (e.g. 0.0008) */
export function getRwfToUsdRate(): number {
  return parseRate(process.env.RWF_TO_USD_RATE, 0.0008)
}

export function rwfToUsdAmount(rwf: number): number {
  if (!Number.isFinite(rwf)) return 0
  const rate = getRwfToUsdRate()
  return Math.round(rwf * rate * 100) / 100
}

export function usdToRwfAmount(usd: number): number {
  if (!Number.isFinite(usd)) return 0
  const rate = getRwfToUsdRate()
  return Math.max(1, Math.round(usd / rate))
}

/**
 * Amount + fiat code for gateways that only accept USD (e.g. NowPayments invoice).
 * RWF orders are converted using RWF_TO_USD_RATE.
 */
export function orderTotalsForUsdGateway(
  totalAmount: number,
  orderCurrency: string | null | undefined
): { amount: number; currency: "USD" } {
  const c = (orderCurrency || "USD").toUpperCase()
  if (c === "RWF") {
    return { amount: rwfToUsdAmount(totalAmount), currency: "USD" }
  }
  if (c === "USD") {
    return { amount: Number(totalAmount), currency: "USD" }
  }
  return { amount: Number(totalAmount), currency: "USD" }
}
