import type { CurrencyCode } from "./config";

const TTL_MS = 900_000; // 15 minutes

let cache: { rates: Record<string, number>; fetchedAt: number } | null = null;

function normalizeRates(raw: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = { USD: 1 };
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === "number" && Number.isFinite(v)) {
      out[k.toUpperCase()] = v;
    }
  }
  return out;
}

/**
 * Fetches USD-based rates (how many units of each currency per 1 USD).
 * On fetch error, returns the last successful cache; never throws.
 */
export async function getRates(): Promise<Record<string, number>> {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < TTL_MS) {
    return cache.rates;
  }

  const url = process.env.EXCHANGE_RATE_API_URL?.trim() || "https://api.exchangerate-api.com/v4/latest/USD";

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { rates?: Record<string, number> };
    const raw = data.rates;
    if (!raw || typeof raw !== "object") throw new Error("Invalid rates payload");
    const rates = normalizeRates(raw);
    cache = { rates, fetchedAt: now };
    return rates;
  } catch {
    if (cache) return cache.rates;
    return {};
  }
}

function roundForCurrency(amount: number, code: CurrencyCode): number {
  if (code === "USD") {
    return Math.round(amount * 100) / 100;
  }
  return Math.round(amount);
}

export async function convertFromUSD(amountUSD: number, to: CurrencyCode): Promise<number> {
  if (!Number.isFinite(amountUSD)) return 0;
  if (to === "USD") return roundForCurrency(amountUSD, "USD");
  const rates = await getRates();
  const rate = rates[to];
  if (rate == null || !Number.isFinite(rate)) return roundForCurrency(amountUSD, to);
  const converted = amountUSD * rate;
  return roundForCurrency(converted, to);
}

export async function convertToUSD(amount: number, from: CurrencyCode): Promise<number> {
  if (!Number.isFinite(amount)) return 0;
  if (from === "USD") return Math.round(amount * 100) / 100;
  const rates = await getRates();
  const rate = rates[from];
  if (rate == null || !Number.isFinite(rate) || rate === 0) return Math.round(amount * 100) / 100;
  const usd = amount / rate;
  return Math.round(usd * 100) / 100;
}
