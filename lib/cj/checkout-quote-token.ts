import { createHmac, timingSafeEqual } from "crypto";
import type { CJShippingOption } from "@/types/checkout";
import type { CjFreightProduct } from "@/lib/cj/checkout-shipping";
import { findMatchingCheckoutShippingRate, type CheckoutShippingSelection } from "@/lib/cj/checkout-shipping";

const QUOTE_TTL_MS = 30 * 60 * 1000;

export type CheckoutQuotePayload = {
  v: 1;
  exp: number;
  dest: string;
  currency: string;
  products: Array<{ vid: string; quantity: number; weight?: number }>;
  rates: CJShippingOption[];
};

function quoteSigningSecret(): string {
  return (
    process.env.CHECKOUT_QUOTE_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.CJ_API_KEY ||
    ""
  );
}

function productsFingerprint(
  products: Array<{ vid: string; quantity: number; weight?: number }>
): string {
  return products
    .map((p) => `${p.vid}:${p.quantity}:${p.weight ?? ""}`)
    .sort()
    .join("|");
}

function encodePayload(payload: CheckoutQuotePayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodePayload(encoded: string): CheckoutQuotePayload | null {
  try {
    const json = Buffer.from(encoded, "base64url").toString("utf8");
    const parsed = JSON.parse(json) as CheckoutQuotePayload;
    if (parsed?.v !== 1 || !Array.isArray(parsed.rates) || !parsed.dest) return null;
    return parsed;
  } catch {
    return null;
  }
}

function sign(encoded: string): string {
  const secret = quoteSigningSecret();
  if (!secret) throw new Error("Checkout quote signing secret is not configured");
  return createHmac("sha256", secret).update(encoded).digest("base64url");
}

function signaturesMatch(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function createCheckoutQuoteToken(params: {
  destCountryCode: string;
  orderCurrency: string;
  products: CjFreightProduct[];
  rates: CJShippingOption[];
  ttlMs?: number;
}): string {
  const payload: CheckoutQuotePayload = {
    v: 1,
    exp: Date.now() + (params.ttlMs ?? QUOTE_TTL_MS),
    dest: params.destCountryCode.toUpperCase(),
    currency: params.orderCurrency.toUpperCase(),
    products: params.products.map((p) => ({
      vid: p.vid,
      quantity: p.quantity,
      ...(p.weight && p.weight > 0 ? { weight: p.weight } : {}),
    })),
    rates: params.rates,
  };
  const encoded = encodePayload(payload);
  return `${encoded}.${sign(encoded)}`;
}

export function verifyCheckoutQuoteToken(
  token: string | null | undefined
): CheckoutQuotePayload | null {
  if (!token || typeof token !== "string" || !token.includes(".")) return null;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;

  try {
    const expected = sign(encoded);
    if (!signaturesMatch(signature, expected)) return null;
  } catch {
    return null;
  }

  const payload = decodePayload(encoded);
  if (!payload) return null;
  if (!Number.isFinite(payload.exp) || payload.exp < Date.now()) return null;
  if (!payload.rates.length) return null;
  return payload;
}

export function quoteProductsMatchOrder(
  payload: CheckoutQuotePayload,
  products: CjFreightProduct[],
  destCountryCode: string
): boolean {
  if (payload.dest.toUpperCase() !== destCountryCode.toUpperCase()) return false;
  return productsFingerprint(payload.products) === productsFingerprint(products);
}

export function resolveTrustedRateFromQuoteToken(params: {
  token: string | null | undefined;
  selection: CheckoutShippingSelection;
  products: CjFreightProduct[];
  destCountryCode: string;
}): CJShippingOption | null {
  const payload = verifyCheckoutQuoteToken(params.token);
  if (!payload) return null;
  if (!quoteProductsMatchOrder(payload, params.products, params.destCountryCode)) {
    return null;
  }
  return findMatchingCheckoutShippingRate(payload.rates, params.selection);
}
