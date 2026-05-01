// /**
//  * lib/flutterwave.ts
//  * Flutterwave payment integration for Jimvio
//  * Docs: https://developer.flutterwave.com/docs
//  */

// function getFlutterwaveBaseUrl(): string {
//   return (process.env.FLW_BASE_URL || "https://api.flutterwave.com/v3").trim();
// }

// function getFlutterwaveSecretKey(): string {
//   // Try preferred name first, fallback to old name for backwards compatibility
//   const rawKey = process.env.FLW_SECRET_KEY || process.env.FLUTTERWAVE_SECRET_KEY;
//   if (!rawKey) {
//     throw new Error(
//       "Flutterwave FLW_SECRET_KEY is not configured in .env"
//     );
//   }
//   // Trim and strip quotes in case they were left in
//   return rawKey.trim().replace(/^["']|["']$/g, "");
// }

// async function flwFetch<T>(
//   endpoint: string,
//   options: RequestInit = {}
// ): Promise<T> {
//   const baseUrl = getFlutterwaveBaseUrl();
//   const key = getFlutterwaveSecretKey();

//   const res = await fetch(`${baseUrl}${endpoint}`, {
//     ...options,
//     headers: {
//       Authorization: `Bearer ${key}`,
//       "Content-Type": "application/json",
//       ...options.headers,
//     },
//   });

//   const data = await res.json().catch(() => ({}));
//   if (!res.ok) {
//     const errorDetails = JSON.stringify(data);
//     const msg = (data as { message?: string }).message || "Error";
//     throw new Error(`Flutterwave ${res.status}: ${msg} | Details: ${errorDetails}`);
//   }
//   return data as T;
// }

// /** 
//  * Ensure phone number is in full international format (e.g. +250...)
//  * for reliable OTP delivery via SMS.
//  */
// function formatPhoneInternational(phone: string | undefined): string | undefined {
//   if (!phone) return undefined;

//   // Remove all non-numeric characters except +
//   let cleaned = phone.replace(/[^\d+]/g, "").trim();

//   if (!cleaned) return undefined;

//   // If already starts with +, trust it but ensure it has enough digits
//   if (cleaned.startsWith("+")) return cleaned;

//   // Rwanda specific: if starts with 07..., convert to +2507...
//   if (cleaned.startsWith("0")) {
//     return "+250" + cleaned.substring(1);
//   }

//   // If it's 9 or 10 digits without prefix, assume Rwanda +250
//   if (cleaned.length >= 9 && cleaned.length <= 10 && !cleaned.startsWith("250")) {
//     return "+250" + cleaned;
//   }

//   // Final fallback: just ensure + prefix
//   return cleaned.startsWith("+") ? cleaned : "+" + cleaned;
// }

// export interface FlutterwavePaymentParams {
//   txRef: string;          // Our unique order reference (UUID)
//   amount: number;
//   currency: string;       // e.g. "USD", "RWF", "NGN"
//   redirectUrl: string;    // Where to redirect after payment
//   customerEmail: string;
//   customerName: string;
//   customerPhone?: string;
//   orderDescription?: string;
//   paymentOptions?: string;
//   /** 
//    * OTP Channel: "sms" (force SMS), "whatsapp", or "sms,whatsapp".
//    * Note: Flutterwave may ignore this for some hosted flows, but it's
//    * valid for direct charge and some specialized integration modes.
//    */
//   channel?: "sms" | "whatsapp" | "sms,whatsapp";
// }

// export interface FlutterwavePaymentLink {
//   status: string;
//   data: {
//     link: string;
//   };
// }

// /** Create a hosted Flutterwave payment link */
// export async function createFlutterwavePaymentLink(
//   params: FlutterwavePaymentParams
// ): Promise<string> {
//   const formattedPhone = formatPhoneInternational(params.customerPhone);
//   const otpChannel = params.channel || "sms"; // Default to SMS as requested

//   const payload: any = {
//     tx_ref: params.txRef,
//     amount: params.amount,
//     currency: (params.currency || "USD").toUpperCase(),
//     redirect_url: params.redirectUrl,
//     customer: {
//       email: params.customerEmail,
//       name: params.customerName,
//       phonenumber: formattedPhone || undefined,
//     },
//     // Adding channel field here. Even if it's Hosted Checkout, 
//     // it helps Flutterwave route notifications correctly.
//     channel: otpChannel,
//     country: (params.currency || "USD").toUpperCase() === "USD" ? undefined : "RW",
//     payment_options: params.paymentOptions || (
//       (params.currency || "USD").toUpperCase() === "RWF"
//         ? "mobilemoneyrwanda"
//         : "card,mobilemoneyrwanda,googlepay,ugx,ussd"
//     ),
//     customizations: {
//       title: "Jimvio",
//       description: params.orderDescription || "Order Payment",
//       logo: (process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes("localhost"))
//         ? `${process.env.NEXT_PUBLIC_APP_URL}/logo.png`
//         : undefined,
//     },
//   };

//   const minAmount = (params.currency || "USD").toUpperCase() === "RWF" ? 100 : 1;
//   const finalPayload = {
//     ...payload,
//     amount: Math.max(minAmount, Number(params.amount)),
//   };

//   console.log(`[Flutterwave] Initiating payment. Reference: ${params.txRef}, Phone: ${formattedPhone}, OTP Channel: ${otpChannel}`);

//   const data = await flwFetch<FlutterwavePaymentLink>("/payments", {
//     method: "POST",
//     body: JSON.stringify(finalPayload),
//   });

//   if (!data.data?.link) {
//     throw new Error("Flutterwave API succeeded but returned no payment link.");
//   }
//   return data.data.link;
// }

// export interface FlutterwaveVerifyResponse {
//   status: string;
//   data: {
//     id: number;
//     tx_ref: string;
//     flw_ref: string;
//     amount: number;
//     currency: string;
//     status: string;         // "successful" | "failed" | "pending"
//     payment_type: string;
//     customer: {
//       email: string;
//       name: string;
//     };
//   };
// }

// /** Verify a transaction by ID — always verify server-side after redirect */
// export async function verifyFlutterwaveTransaction(
//   transactionId: string | number
// ): Promise<FlutterwaveVerifyResponse["data"]> {
//   const result = await flwFetch<FlutterwaveVerifyResponse>(
//     `/transactions/${transactionId}/verify`
//   );
//   if (result.status !== "success") {
//     throw new Error("Flutterwave verification failed.");
//   }
//   return result.data;
// }

// /**
//  * Validate Flutterwave webhook signature.
//  * FLW sends x-flw-signature or verif-hash header depending on config
//  */
// export function validateFlutterwaveWebhook(
//   rawBody: string,
//   signature: string | null
// ): boolean {
//   if (!signature) return false;

//   const secret = process.env.FLW_WEBHOOK_SECRET || process.env.FLUTTERWAVE_WEBHOOK_HASH;
//   if (!secret) return false;

//   // Flutterwave signature verification
//   // If we are using a simple hash check:
//   if (signature === secret.trim().replace(/^["']|["']$/g, "")) {
//     return true;
//   }

//   // If we want HMAC-SHA256 (advanced):
//   try {
//     const crypto = require("crypto") as typeof import("crypto");
//     const expected = crypto
//       .createHmac("sha256", secret)
//       .update(rawBody)
//       .digest("hex");

//     // Some FLW webhooks use verify-hash which is just the string, 
//     // but some use a hash signature. 
//     // In jimvio we use the secret hash directly as confirmed by FLW docs for "Secret Hash"
//     return signature === secret;
//   } catch {
//     return false;
//   }
// }
/**
 * lib/flutterwave.ts
 * Flutterwave payment integration
 * Docs: https://developer.flutterwave.com/docs
 */

import crypto from "crypto";

/* ── Config ─────────────────────────────────────────────────────── */

function getBaseUrl(): string {
  return (process.env.FLW_BASE_URL || "https://api.flutterwave.com/v3").trim();
}

function getSecretKey(): string {
  const key = process.env.FLW_SECRET_KEY || process.env.FLUTTERWAVE_SECRET_KEY;
  if (!key) throw new Error("FLW_SECRET_KEY is not configured in .env");
  return key.trim().replace(/^["']|["']$/g, "");
}

function getWebhookSecret(): string {
  const secret = process.env.FLW_WEBHOOK_SECRET || process.env.FLUTTERWAVE_WEBHOOK_HASH;
  if (!secret) throw new Error("FLW_WEBHOOK_SECRET is not configured in .env");
  return secret.trim().replace(/^["']|["']$/g, "");
}

/* ── Custom error ────────────────────────────────────────────────── */

export class FlutterwaveError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "FlutterwaveError";
  }

  get isNotFound() {
    return this.statusCode === 404 ||
      this.message.toLowerCase().includes("no transaction");
  }

  get isRateLimit() {
    return this.statusCode === 429;
  }
}

/* ── Core fetch ──────────────────────────────────────────────────── */

async function flwFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  retries = 1
): Promise<T> {
  const url = `${getBaseUrl()}${endpoint}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${getSecretKey()}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await res.json().catch(() => ({})) as Record<string, unknown>;

  if (!res.ok) {
    // Retry on rate limit or 5xx
    if (retries > 0 && (res.status === 429 || res.status >= 500)) {
      const delay = res.status === 429 ? 5000 : 2000;
      console.warn(`[Flutterwave] ${res.status} on ${endpoint}, retrying in ${delay}ms...`);
      await sleep(delay);
      return flwFetch<T>(endpoint, options, retries - 1);
    }

    const msg = (data.message as string) || "Unknown error";
    throw new FlutterwaveError(
      `Flutterwave ${res.status}: ${msg}`,
      res.status,
      data
    );
  }

  return data as T;
}

/* ── Helpers ─────────────────────────────────────────────────────── */

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatPhone(phone: string | undefined): string | undefined {
  if (!phone) return undefined;
  const cleaned = phone.replace(/[^\d+]/g, "").trim();
  if (!cleaned) return undefined;
  if (cleaned.startsWith("+")) return cleaned;
  if (cleaned.startsWith("0")) return `+250${cleaned.slice(1)}`;
  if (cleaned.length >= 9 && cleaned.length <= 10) return `+250${cleaned}`;
  return `+${cleaned}`;
}

function getPaymentOptions(currency: string): string {
  const c = currency.toUpperCase();
  if (c === "RWF") return "card,mobilemoneyrwanda,googlepay";
  if (c === "UGX") return "card,mobilemoneyuganda,googlepay";
  if (c === "GHS") return "card,mobilemoneyghana,googlepay";
  if (c === "KES") return "card,mpesa,googlepay";
  if (c === "NGN") return "card,banktransfer,ussd,googlepay";
  return "card,googlepay,applepay";
}

function getCountryCode(currency: string): string | undefined {
  const map: Record<string, string> = {
    RWF: "RW", UGX: "UG", GHS: "GH", KES: "KE", NGN: "NG",
    ZMW: "ZM", TZS: "TZ", XOF: "SN", ZAR: "ZA",
  };
  return map[currency.toUpperCase()];
}

/* ── Types ───────────────────────────────────────────────────────── */

export interface CreatePaymentLinkParams {
  txRef: string;
  amount: number;
  currency: string;
  redirectUrl: string;
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  orderDescription?: string;
  paymentOptions?: string;
  channel?: "sms" | "whatsapp" | "sms,whatsapp";
  meta?: Record<string, string>;
}

export interface FlutterwaveVerifyResponse {
  status: string;
  data: {
    id: number;
    tx_ref: string;
    flw_ref: string;
    amount: number;
    amount_settled: number;
    currency: string;
    status: "successful" | "failed" | "pending";
    payment_type: string;
    created_at: string;
    customer: {
      id: number;
      email: string;
      name: string;
      phone_number: string;
    };
    meta?: Record<string, unknown>;
  };
}

export type VerifiedTransaction = FlutterwaveVerifyResponse["data"];

/* ── Payment link ────────────────────────────────────────────────── */

export async function createFlutterwavePaymentLink(
  params: CreatePaymentLinkParams
): Promise<string> {
  const currency = params.currency.toUpperCase();
  const minAmount = currency === "RWF" ? 100 : 1;
  const amount = Math.max(minAmount, Number(params.amount));
  const phone = formatPhone(params.customerPhone);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  const payload = {
    tx_ref: params.txRef,
    amount,
    currency,
    redirect_url: params.redirectUrl,
    customer: {
      email: params.customerEmail,
      name: params.customerName,
      ...(phone && { phonenumber: phone }),
    },
    payment_options: params.paymentOptions ?? getPaymentOptions(currency),
    ...(getCountryCode(currency) && { country: getCountryCode(currency) }),
    ...(params.channel && { channel: params.channel }),
    ...(params.meta && { meta: params.meta }),
    customizations: {
      title: "Jimvio",
      description: params.orderDescription || "Order payment",
      ...(appUrl && !appUrl.includes("localhost") && {
        logo: `${appUrl}/logo.png`,
      }),
    },
  };

  console.log("[Flutterwave] Creating payment link", {
    txRef: params.txRef,
    amount,
    currency,
    phone,
  });

  const data = await flwFetch<{ status: string; data: { link: string } }>(
    "/payments",
    { method: "POST", body: JSON.stringify(payload) }
  );

  if (!data.data?.link) {
    throw new FlutterwaveError("No payment link returned", 200, data);
  }

  return data.data.link;
}


export async function verifyFlutterwaveTransaction(
  transactionId: string | number,
  options: {
    retryOnNotFound?: boolean;
    maxRetries?: number;
    initialDelayMs?: number;
    useTxRef?: boolean;
  } = {}
): Promise<VerifiedTransaction> {
  const {
    retryOnNotFound = true,
    maxRetries = 3,
    initialDelayMs = 5000,
    useTxRef = false,
  } = options;

  function buildEndpoint(): string {
    if (useTxRef) {
      return `/transactions/verify_by_reference?tx_ref=${encodeURIComponent(String(transactionId))}`;
    }
    return `/transactions/${transactionId}/verify`;
  }

  async function fetchAndNormalize(): Promise<FlutterwaveVerifyResponse> {
    if (useTxRef) {
      // List endpoint returns { status, data: [...] }
      const result = await flwFetch<{
        status: string;
        data: FlutterwaveVerifyResponse["data"][];
      }>(buildEndpoint());

      if (result.status !== "success" || !result.data?.length) {
        throw new FlutterwaveError(
          "No transaction was found for this id",
          400,
          result
        );
      }
      return { status: "success", data: result.data[0] };
    }

    // Standard verify by numeric ID
    return flwFetch<FlutterwaveVerifyResponse>(buildEndpoint());
  }

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await fetchAndNormalize();

      if (result.status !== "success") {
        throw new FlutterwaveError(
          "Verification returned non-success status",
          200,
          result
        );
      }

      if (attempt > 0) {
        console.log(
          `[Flutterwave] Transaction ${transactionId} verified on attempt ${attempt + 1}`
        );
      }

      return result.data;
    } catch (err) {
      lastError = err;

      const isNotFound = err instanceof FlutterwaveError && err.isNotFound;

      if (!retryOnNotFound || !isNotFound || attempt === maxRetries) {
        break;
      }

      // Exponential backoff: 5s → 10s → 20s
      const delay = initialDelayMs * Math.pow(2, attempt);
      console.warn(
        `[Flutterwave] Transaction ${transactionId} not found (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay / 1000}s...`
      );
      await sleep(delay);
    }
  }

  throw lastError;
}

/* ── Webhook validation ──────────────────────────────────────────── */

export function validateFlutterwaveWebhook(
  rawBody: string,
  signature: string | null
): boolean {
  if (!signature) {
    console.warn("[Flutterwave] Webhook received with no signature");
    return false;
  }

  let secret: string;
  try {
    secret = getWebhookSecret();
  } catch {
    console.error("[Flutterwave] Webhook secret not configured");
    return false;
  }

  // Flutterwave "Secret Hash" method — direct string comparison
  // This is the standard method per FLW docs for hosted checkout webhooks
  const isValid = crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(secret)
  );

  if (!isValid) {
    console.warn("[Flutterwave] Webhook signature mismatch");
  }

  return isValid;
}

/* ── Refund (optional) ───────────────────────────────────────────── */

export async function refundFlutterwaveTransaction(
  transactionId: string | number,
  amount?: number
): Promise<{ id: number; status: string }> {
  const payload = amount ? { amount } : {};

  const data = await flwFetch<{ status: string; data: { id: number; status: string } }>(
    `/transactions/${transactionId}/refund`,
    { method: "POST", body: JSON.stringify(payload) }
  );

  return data.data;
}