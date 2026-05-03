/**
 * NowPayments API service for cryptocurrency payments.
 * Docs: https://documenter.getpostman.com/view/7907941/2s93JusNJt
 */

const BASE_URL = "https://api.nowpayments.io/v1";

export interface CreatePaymentParams {
  price_amount: number;
  price_currency: string;
  pay_currency: string; // Required: e.g. "btc", "eth", "usdttrc20"
  order_id: string;
  order_description?: string;
  ipn_callback_url?: string;
  success_url?: string;
  cancel_url?: string;
}

export interface NowPaymentResponse {
  payment_id: number;
  payment_status: string;
  pay_address: string;
  price_amount: number;
  price_currency: string;
  pay_amount: number;
  pay_currency: string;
  order_id: string;
  order_description?: string;
  created_at: string;
  updated_at: string;
  purchase_id: string;
  expiration_estimate_date: string;
}

export interface PaymentStatusResponse {
  payment_id: number;
  payment_status: string;
  pay_address: string;
  price_amount: number;
  price_currency: string;
  pay_amount: number;
  pay_currency: string;
  order_id: string;
  created_at: string;
  updated_at: string;
}

export interface IPNPayload {
  payment_id: number;
  payment_status: string;
  pay_address: string;
  price_amount: number;
  price_currency: string;
  pay_amount: number;
  pay_currency: string;
  order_id: string;
  order_description?: string;
  created_at: string;
  updated_at: string;
}

async function nowpaymentsFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const apiKey = process.env.NOWPAYMENTS_API_KEY;
  if (!apiKey) {
    throw new Error("NOWPAYMENTS_API_KEY is not configured");
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data as { message?: string })?.message || res.statusText;
    throw new Error(`NowPayments API error: ${msg}`);
  }
  return data as T;
}

export async function createPayment(params: CreatePaymentParams): Promise<NowPaymentResponse> {
  return nowpaymentsFetch<NowPaymentResponse>("/payment", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function getPaymentStatus(paymentId: number): Promise<PaymentStatusResponse> {
  return nowpaymentsFetch<PaymentStatusResponse>(`/payment/${paymentId}`);
}

export async function getCurrencies(): Promise<{ currencies: string[] }> {
  return nowpaymentsFetch<{ currencies: string[] }>("/currencies");
}

export async function getEstimate(
  amount: number,
  currencyFrom: string = "usd",
  currencyTo?: string
): Promise<{ estimated_amount: number; pay_amount: number; pay_currency: string }> {
  const params = new URLSearchParams({
    amount: String(amount),
    currency_from: currencyFrom,
    ...(currencyTo && { currency_to: currencyTo }),
  });
  return nowpaymentsFetch<{ estimated_amount: number; pay_amount: number; pay_currency: string }>(
    `/estimate?${params}`
  );
}

/**
 * Validate IPN webhook signature using HMAC-SHA512.
 * NowPayments sends x-nowpayments-sig header.
 * Body must be sorted alphabetically by keys before hashing.
 */
export function validateIPNSignature(
  body: string,
  signature: string | null,
  ipnSecret: string
): boolean {
  if (!signature || !ipnSecret) return false;
  try {
    const crypto = require("crypto");
    const params = JSON.parse(body);
    const sortedBody = JSON.stringify(params, Object.keys(params).sort());
    const hmac = crypto.createHmac("sha512", ipnSecret);
    hmac.update(sortedBody);
    const expected = hmac.digest("hex");
    const sigBuf = Buffer.from(signature, "hex");
    const expBuf = Buffer.from(expected, "hex");
    return sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf);
  } catch {
    return false;
  }
}
