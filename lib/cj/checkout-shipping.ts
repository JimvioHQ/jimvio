import { forceRefreshFromApiKey, getOrRefreshAccessToken } from "@/lib/cj/auth";
import { sanitizeShippingMethodName } from "@/lib/cj/customer-facing";
import { isCjApiQuotaError } from "@/lib/cj/customer-errors-shared";
import {
  isCjQuotaCircuitOpen,
  markCjQuotaExhausted,
  quotaCircuitAssertMessage,
} from "@/lib/cj/quota-circuit";
import { normalizeCountryCode } from "@/lib/geo/buyer-country";
import { usableCjVid } from "@/lib/cj/variant-vid";
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

const FREIGHT_TIMEOUT_MS = 20_000;
const FREIGHT_RETRY_BASE_MS = 700;
const FREIGHT_CACHE_TTL_MS = 10 * 60 * 1000;
/** Short local cooldown so a single checkout session does not hammer CJ after a quota miss. */
const CHECKOUT_QUOTA_COOLDOWN_MS = 2 * 60 * 1000;
let checkoutQuotaCooldownUntil = 0;
const freightQuoteCache = new Map<
  string,
  { expiresAt: number; rates: CJShippingOption[]; fxRate: number; unavailable?: boolean }
>();
/** Coalesce identical in-flight freightCalculate calls (Strict Mode / double submit). */
const freightInFlight = new Map<
  string,
  Promise<{ rates: CJShippingOption[]; fxRate: number; unavailable?: boolean }>
>();

export { isCjQuotaCircuitOpen, markCjQuotaExhausted };

function assertCheckoutQuotaCooldownClosed(): void {
  if (Date.now() < checkoutQuotaCooldownUntil) {
    throw new Error(quotaCircuitAssertMessage());
  }
}

function openCheckoutQuotaCooldown(): void {
  checkoutQuotaCooldownUntil = Date.now() + CHECKOUT_QUOTA_COOLDOWN_MS;
}

function freightQuoteCacheKey(
  destCountryCode: string,
  products: CjFreightProduct[],
  orderCurrency = "USD"
): string {
  const lines = products
    .map((item) => `${item.vid}:${item.quantity}:${item.weight ?? ""}`)
    .sort()
    .join("|");
  return `${destCountryCode}::${orderCurrency.toUpperCase()}::${lines}`;
}

export class CheckoutShippingCoverageError extends Error {
  readonly kind = "no_coverage" as const;
  constructor(message = "NO_COVERAGE") {
    super(message);
    this.name = "CheckoutShippingCoverageError";
  }
}

export function isCheckoutShippingCoverageError(
  error: unknown
): error is CheckoutShippingCoverageError {
  return error instanceof CheckoutShippingCoverageError;
}

function isNoCoverageMessage(message: string): boolean {
  return /no logistic|not support|unsupported destination|cannot find|no available|no shipping|not available|unable to calculate|no route|endCountry/i.test(
    message
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientFreightFailure(status: number, message: string): boolean {
  if (status === 429 || status >= 500) return true;
  return /timeout|timed out|abort|network|fetch failed|econnreset|etimedout/i.test(
    message
  );
}

export function toCheckoutFreightProducts(
  items: Array<{ vid?: string | null; quantity: number; weight?: number | null }>
): CjFreightProduct[] {
  const products: CjFreightProduct[] = [];
  for (const item of items) {
    const vid = usableCjVid(item.vid);
    if (!vid || item.quantity <= 0) continue;
    const product: CjFreightProduct = { vid, quantity: item.quantity };
    if (typeof item.weight === "number" && Number.isFinite(item.weight) && item.weight > 0) {
      product.weight = item.weight;
    }
    products.push(product);
  }
  return products;
}

function freightBody(destCountryCode: string, products: CjFreightProduct[]) {
  const lines = products.map((item) => {
    const row: { vid: string; quantity: number; weight?: number } = {
      vid: item.vid,
      quantity: item.quantity,
    };
    if (item.weight && item.weight > 0) row.weight = item.weight;
    return row;
  });

  const totalWeight = products.reduce(
    (sum, item) => sum + (item.weight ?? 0) * item.quantity,
    0
  );

  const body: Record<string, unknown> = {
    startCountryCode: "CN",
    endCountryCode: destCountryCode,
    products: lines,
  };
  if (totalWeight > 0) body.weight = totalWeight;
  return body;
}

async function requestCjFreight(
  token: string,
  destCountryCode: string,
  products: CjFreightProduct[]
): Promise<{ rows: CjFreightRow[]; message: string; ok: boolean; status: number; authFailed?: boolean }> {
  const res = await fetch(`${CJ_BASE}/logistic/freightCalculate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "CJ-Access-Token": token,
    },
    body: JSON.stringify(freightBody(destCountryCode, products)),
    signal: AbortSignal.timeout(FREIGHT_TIMEOUT_MS),
  });

  const json = (await res.json().catch(() => ({}))) as {
    data?: CjFreightRow[];
    message?: string;
    result?: boolean;
    code?: number | string;
  };
  const message = json?.message ?? `HTTP ${res.status}`;
  const authFailed =
    res.status === 401 ||
    res.status === 403 ||
    /access.?token|unauthorized|token.*(invalid|expired|expire)/i.test(message);
  const ok = res.ok && json?.result !== false && !authFailed;
  const rows = Array.isArray(json?.data) ? json.data : [];
  return { rows, message, ok, status: res.status, authFailed };
}

export async function fetchCjCheckoutFreightRates(params: {
  destCountryCode: string;
  products: CjFreightProduct[];
  orderCurrency?: string;
}): Promise<{ rates: CJShippingOption[]; fxRate: number; unavailable?: boolean }> {
  const destCountryCode = normalizeCountryCode(params.destCountryCode) ?? "";
  const orderCurrency = params.orderCurrency || "USD";
  const validProducts = toCheckoutFreightProducts(params.products);

  if (!destCountryCode) {
    throw new Error("A valid destination country is required");
  }
  if (!validProducts.length) {
    throw new Error("Please choose your product options before checkout.");
  }

  const cacheKey = freightQuoteCacheKey(destCountryCode, validProducts, orderCurrency);
  const cached = freightQuoteCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return {
      rates: cached.rates,
      fxRate: cached.fxRate,
      unavailable: cached.unavailable,
    };
  }

  const existing = freightInFlight.get(cacheKey);
  if (existing) return existing;

  const pending = (async () => {
    // Short cooldown only — never hard-block checkout on the durable background
    // circuit, so quotes resume as soon as CJ daily points reset.
    assertCheckoutQuotaCooldownClosed();

    let token = await getOrRefreshAccessToken();
    let lastMessage = "";
    let lastStatus = 0;
    let didAuthRefresh = false;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const result = await requestCjFreight(token, destCountryCode, validProducts);
        lastMessage = result.message;
        lastStatus = result.status;

        if (result.authFailed && !didAuthRefresh) {
          didAuthRefresh = true;
          const refreshed = await forceRefreshFromApiKey();
          token = refreshed.accessToken;
          attempt -= 1;
          continue;
        }

        if (result.ok) {
          const fxRate = await getExchangeRate("USD", orderCurrency);
          const rates = normalizeCjFreightRows(result.rows, orderCurrency, fxRate);
          const payload = { rates, fxRate, unavailable: rates.length === 0 };
          // Cache successful quotes; keep empty coverage briefly so we don't thrash CJ points.
          freightQuoteCache.set(cacheKey, {
            expiresAt: Date.now() + (rates.length === 0 ? 60_000 : FREIGHT_CACHE_TTL_MS),
            ...payload,
          });
          return payload;
        }

        if (isCjApiQuotaError(result.message)) {
          markCjQuotaExhausted(result.message);
          openCheckoutQuotaCooldown();
          throw new Error(result.message);
        }

        if (isNoCoverageMessage(result.message)) {
          throw new CheckoutShippingCoverageError(result.message);
        }

        if (attempt < 2 && isTransientFreightFailure(result.status, result.message)) {
          const delay =
            result.status === 429
              ? FREIGHT_RETRY_BASE_MS * Math.pow(2, attempt + 1)
              : FREIGHT_RETRY_BASE_MS * Math.pow(2, attempt);
          await sleep(delay);
          continue;
        }

        throw new Error(result.message || "Shipping quote failed");
      } catch (error) {
        if (isCheckoutShippingCoverageError(error)) throw error;
        const message = error instanceof Error ? error.message : String(error);
        lastMessage = message;
        if (isCjApiQuotaError(message)) {
          markCjQuotaExhausted(message);
          openCheckoutQuotaCooldown();
          throw error instanceof Error ? error : new Error(message);
        }
        if (attempt < 2 && isTransientFreightFailure(lastStatus, message)) {
          await sleep(FREIGHT_RETRY_BASE_MS * Math.pow(2, attempt));
          continue;
        }
        if (isNoCoverageMessage(message)) {
          throw new CheckoutShippingCoverageError(message);
        }
        throw error instanceof Error ? error : new Error(message);
      }
    }

    throw new Error(lastMessage || "Shipping quote failed");
  })();

  freightInFlight.set(cacheKey, pending);
  try {
    return await pending;
  } finally {
    freightInFlight.delete(cacheKey);
  }
}
