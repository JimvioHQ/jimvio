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

/** 
 * Ensure phone number is in full international format (e.g. +250...)
 * for reliable OTP delivery via SMS.
 */
function formatPhoneInternational(phone: string | undefined): string | undefined {
  if (!phone) return undefined;
  
  // Remove all non-numeric characters except +
  let cleaned = phone.replace(/[^\d+]/g, "").trim();
  
  if (!cleaned) return undefined;

  // If already starts with +, trust it but ensure it has enough digits
  if (cleaned.startsWith("+")) return cleaned;

  // Rwanda specific: if starts with 07..., convert to +2507...
  if (cleaned.startsWith("0")) {
    return "+250" + cleaned.substring(1);
  }

  // If it's 9 or 10 digits without prefix, assume Rwanda +250
  if (cleaned.length >= 9 && cleaned.length <= 10 && !cleaned.startsWith("250")) {
    return "+250" + cleaned;
  }

  // Final fallback: just ensure + prefix
  return cleaned.startsWith("+") ? cleaned : "+" + cleaned;
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
  /** 
   * OTP Channel: "sms" (force SMS), "whatsapp", or "sms,whatsapp".
   * Note: Flutterwave may ignore this for some hosted flows, but it's
   * valid for direct charge and some specialized integration modes.
   */
  channel?: "sms" | "whatsapp" | "sms,whatsapp";
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
  const formattedPhone = formatPhoneInternational(params.customerPhone);
  const otpChannel = params.channel || "sms"; // Default to SMS as requested

  const payload: any = {
    tx_ref: params.txRef,
    amount: params.amount,
    currency: (params.currency || "USD").toUpperCase(),
    redirect_url: params.redirectUrl,
    customer: {
      email: params.customerEmail,
      name: params.customerName,
      phonenumber: formattedPhone || undefined,
    },
    // Adding channel field here. Even if it's Hosted Checkout, 
    // it helps Flutterwave route notifications correctly.
    channel: otpChannel, 
    country: (params.currency || "USD").toUpperCase() === "USD" ? undefined : "RW",
    // payment_options: params.paymentOptions || (
    //   (params.currency || "USD").toUpperCase() === "RWF" 
    //     ? "mobilemoneyrwanda" 
    //     : "card,mobilemoneyrwanda,googlepay,ugx,ussd"
    // ),
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

  console.log(`[Flutterwave] Initiating payment. Reference: ${params.txRef}, Phone: ${formattedPhone}, OTP Channel: ${otpChannel}`);
  
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
