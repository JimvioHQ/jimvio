import { getOrRefreshAccessToken } from "@/lib/cj/auth";
import { sanitizeShippingMethodName } from "@/lib/cj/customer-facing";
import type { CJShippingOption } from "@/types/checkout";

const CJ_BASE =
  process.env.CJ_API_BASE_URL ??
  "https://developers.cjdropshipping.com/api2.0/v1";

export type CjFreightProduct = {
  vid: string;
  quantity: number;
  weight?: number;
};

type CjFreightRow = {
  logisticName?: string;
  channelName?: string;
  logisticAbbreviation?: string;
  channelCode?: string;
  logisticCode?: string;
  agingMax?: number | string;
  days?: number | string;
  logisticAging?: string;
  logisticPrice?: number | string;
  price?: number;
};

function toPriceUSD(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^\d.]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function formatArrivalDays(row: CjFreightRow): string {
  const raw = row.agingMax ?? row.days ?? row.logisticAging ?? "7-14";
  if (typeof raw === "string") {
    return raw.replace(/\s+/g, "").replace(/–|—/g, "-");
  }
  return String(raw);
}

function resolveChannelId(row: CjFreightRow): string {
  return (
    row.channelCode ??
    row.logisticCode ??
    row.logisticAbbreviation ??
    ""
  ).trim();
}

function resolveRawName(row: CjFreightRow): string {
  return row.logisticName ?? row.channelName ?? "Standard Shipping";
}

/** Stable id shared by fetch + re-quote so checkout selection can be verified. */
export function buildCheckoutShippingOptionId(
  row: CjFreightRow,
  idx: number
): string {
  const channelId = resolveChannelId(row);
  if (channelId) return channelId;
  return sanitizeShippingMethodName(resolveRawName(row)) || `opt-${idx}`;
}

export function normalizeCjFreightRows(
  rows: CjFreightRow[],
  orderCurrency = "USD",
  fxRate = 1
): Array<CJShippingOption & { priceLocal?: number; localCurrency?: string; fxRate?: number }> {
  const rates = rows.map((row, idx) => {
    const channelId = resolveChannelId(row);
    const name = sanitizeShippingMethodName(resolveRawName(row));
    const priceUSD = toPriceUSD(row.logisticPrice ?? row.price);

    return {
      optionId: buildCheckoutShippingOptionId(row, idx),
      channelId,
      name,
      arrivalDays: formatArrivalDays(row),
      priceUSD,
      priceLocal: Number((priceUSD * fxRate).toFixed(2)),
      localCurrency: orderCurrency.toUpperCase(),
      fxRate,
    };
  });

  rates.sort((a, b) => a.priceUSD - b.priceUSD);
  return rates;
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export type CheckoutShippingSelection = {
  optionId?: string;
  channelId?: string;
  name: string;
  priceUSD?: number;
};

/** Match a previously selected option against a fresh CJ quote. */
export function findMatchingCheckoutShippingRate(
  rates: CJShippingOption[],
  selection: CheckoutShippingSelection
): CJShippingOption | null {
  if (!rates.length) return null;

  const candidateKeys = [selection.channelId, selection.optionId].filter(
    Boolean
  ) as string[];

  for (const key of candidateKeys) {
    const hit = rates.find(
      (rate) =>
        rate.channelId === key || rate.optionId === key || rate.name === key
    );
    if (hit) return hit;
  }

  const selectedName = normalizeKey(selection.name);
  const byName = rates.find((rate) => normalizeKey(rate.name) === selectedName);
  if (byName) return byName;

  // Legacy checkout stored optionId as the logistic name before channel codes.
  if (selection.optionId) {
    const legacyOptionId = selection.optionId;
    const legacy = rates.find(
      (rate) =>
        normalizeKey(rate.name) === normalizeKey(legacyOptionId) ||
        rate.channelId === legacyOptionId
    );
    if (legacy) return legacy;
  }

  if (selection.priceUSD != null && Number.isFinite(selection.priceUSD)) {
    const selectedPrice = selection.priceUSD;
    const priceMatches = rates.filter(
      (rate) => Math.abs(rate.priceUSD - selectedPrice) <= 0.05
    );
    if (priceMatches.length === 1) return priceMatches[0];
    const named = priceMatches.find(
      (rate) => normalizeKey(rate.name) === selectedName
    );
    if (named) return named;
  }

  return null;
}

async function getExchangeRate(
  fromCurrency: string,
  toCurrency: string
): Promise<number> {
  if (fromCurrency.toUpperCase() === toCurrency.toUpperCase()) return 1;

  try {
    const res = await fetch(
      `https://api.exchangerate-api.com/v4/latest/${fromCurrency.toUpperCase()}`
    );
    if (!res.ok) throw new Error("Exchange rate fetch failed");
    const data = await res.json();
    return data.rates?.[toCurrency.toUpperCase()] ?? 1;
  } catch {
    return 1;
  }
}

export async function fetchCjCheckoutFreightRates(params: {
  destCountryCode: string;
  products: CjFreightProduct[];
  orderCurrency?: string;
}): Promise<{ rates: CJShippingOption[]; fxRate: number }> {
  const { destCountryCode, products, orderCurrency = "USD" } = params;

  const validProducts = products.filter((item) => item.vid && item.quantity > 0);
  if (!validProducts.length) {
    throw new Error("No valid CJ variants found for shipping calculation");
  }

  const token = await getOrRefreshAccessToken();
  const totalWeight = validProducts.reduce(
    (sum, item) => sum + (item.weight ?? 0) * item.quantity,
    0
  );

  const res = await fetch(`${CJ_BASE}/logistic/freightCalculate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "CJ-Access-Token": token,
    },
    body: JSON.stringify({
      startCountryCode: "CN",
      endCountryCode: destCountryCode,
      products: validProducts.map((item) => ({
        vid: item.vid,
        quantity: item.quantity,
        weight: item.weight && item.weight > 0 ? item.weight : 100,
      })),
      weight: totalWeight > 0 ? totalWeight : 100,
    }),
    signal: AbortSignal.timeout(8000),
  });

  const json = await res.json().catch(() => ({} as { data?: CjFreightRow[]; message?: string; result?: boolean }));

  if (!res.ok || json?.result === false) {
    const msg = json?.message ?? `HTTP ${res.status}`;
    throw new Error(`CJ shipping API error: ${msg}`);
  }

  const raw: CjFreightRow[] = Array.isArray(json?.data) ? json.data : [];
  const fxRate = await getExchangeRate("USD", orderCurrency);
  const rates = normalizeCjFreightRows(raw, orderCurrency, fxRate);

  return { rates, fxRate };
}
