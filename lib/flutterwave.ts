/**
 * lib/flutterwave.ts
 * Flutterwave payment integration for Jimvio
 * Docs: https://developer.flutterwave.com/docs
 */

function getFlutterwaveBaseUrl(): string {
  return (process.env.FLW_BASE_URL || "https://api.flutterwave.com/v3").trim();
}

function getFlutterwaveSecretKey(): string {
  // Try preferred name first, fallback to old name for backwards compatibility
  const rawKey = process.env.FLW_SECRET_KEY || process.env.FLUTTERWAVE_SECRET_KEY;
  if (!rawKey) {
    throw new Error(
      "Flutterwave FLW_SECRET_KEY is not configured in .env"
    );
  }
  // Trim and strip quotes in case they were left in
  return rawKey.trim().replace(/^["']|["']$/g, "");
}

async function flwFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const baseUrl = getFlutterwaveBaseUrl();
  const key = getFlutterwaveSecretKey();
  
  const res = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errorDetails = JSON.stringify(data);
    const msg = (data as { message?: string }).message || "Error";
    throw new Error(`Flutterwave ${res.status}: ${msg} | Details: ${errorDetails}`);
  }
  return data as T;
}

export interface FlutterwavePaymentParams {
  txRef: string;          // Our unique order reference (UUID)
  amount: number;
  currency: string;       // e.g. "USD", "RWF", "NGN"
  redirectUrl: string;    // Where to redirect after payment
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  orderDescription?: string;
  paymentOptions?: string;
}

export interface FlutterwavePaymentLink {
  status: string;
  data: {
    link: string;
  };
}

/** Create a hosted Flutterwave payment link */
export async function createFlutterwavePaymentLink(
  params: FlutterwavePaymentParams
): Promise<string> {
  const payload = {
    tx_ref: params.txRef,
    amount: params.amount,
    currency: (params.currency || "USD").toUpperCase(),
    redirect_url: params.redirectUrl,
    customer: {
      email: params.customerEmail,
      name: params.customerName,
      phonenumber: params.customerPhone || undefined,
    },
    country: (params.currency || "USD").toUpperCase() === "USD" ? undefined : "RW",
    payment_options: params.paymentOptions || (
      (params.currency || "USD").toUpperCase() === "RWF" 
        ? "mobilemoneyrwanda" 
        : "card,applepay,googlepay"
    ),
    customizations: {
      title: "Jimvio",
      description: params.orderDescription || "Order Payment",
      logo: (process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes("localhost")) 
        ? `${process.env.NEXT_PUBLIC_APP_URL}/logo.png` 
        : undefined,
    },
  };

  const minAmount = (params.currency || "USD").toUpperCase() === "RWF" ? 100 : 1;
  const finalPayload = {
    ...payload,
    amount: Math.max(minAmount, Number(params.amount)),
  };

  console.log("[Flutterwave] Creating payment link with payload (Restored):", JSON.stringify(finalPayload, null, 2));

  const data = await flwFetch<FlutterwavePaymentLink>("/payments", {
    method: "POST",
    body: JSON.stringify(finalPayload),
  });

  if (!data.data?.link) {
    throw new Error("Flutterwave API succeeded but returned no payment link.");
  }
  return data.data.link;
}

export interface FlutterwaveVerifyResponse {
  status: string;
  data: {
    id: number;
    tx_ref: string;
    flw_ref: string;
    amount: number;
    currency: string;
    status: string;         // "successful" | "failed" | "pending"
    payment_type: string;
    customer: {
      email: string;
      name: string;
    };
  };
}

/** Verify a transaction by ID — always verify server-side after redirect */
export async function verifyFlutterwaveTransaction(
  transactionId: string | number
): Promise<FlutterwaveVerifyResponse["data"]> {
  const result = await flwFetch<FlutterwaveVerifyResponse>(
    `/transactions/${transactionId}/verify`
  );
  if (result.status !== "success") {
    throw new Error("Flutterwave verification failed.");
  }
  return result.data;
}

/**
 * Validate Flutterwave webhook signature.
 * FLW sends x-flw-signature or verif-hash header depending on config
 */
export function validateFlutterwaveWebhook(
  rawBody: string,
  signature: string | null
): boolean {
  if (!signature) return false;
  
  const secret = process.env.FLW_WEBHOOK_SECRET || process.env.FLUTTERWAVE_WEBHOOK_HASH;
  if (!secret) return false;
  
  // Flutterwave signature verification
  // If we are using a simple hash check:
  if (signature === secret.trim().replace(/^["']|["']$/g, "")) {
    return true;
  }
  
  // If we want HMAC-SHA256 (advanced):
  try {
    const crypto = require("crypto") as typeof import("crypto");
    const expected = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");
    
    // Some FLW webhooks use verify-hash which is just the string, 
    // but some use a hash signature. 
    // In jimvio we use the secret hash directly as confirmed by FLW docs for "Secret Hash"
    return signature === secret;
  } catch {
    return false;
  }
}
