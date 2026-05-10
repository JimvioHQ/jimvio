
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
    signal?: AbortSignal;        // ← ADD THIS
  } = {}
): Promise<VerifiedTransaction> {
  const {
    retryOnNotFound = true,
    maxRetries = 3,
    initialDelayMs = 5000,
    useTxRef = false,
    signal,
  } = options;

  function buildEndpoint(): string {
    if (useTxRef) {
      console.warn(
        "[Flutterwave] Using tx_ref for verification — use transaction ID if possible.",
        transactionId
      );
      // return `/transactions/verify_by_reference?tx_ref=${encodeURIComponent(String(transactionId))}`;
      return `/transaction/verify_by_reference?tx_ref=FLW_MOYN7PK9_9B0D8963`
    }
    return `/transactions/${transactionId}/verify`;
  }

  async function fetchAndNormalize(): Promise<FlutterwaveVerifyResponse> {
    if (signal?.aborted) {
      const err = new Error("Verification aborted");
      err.name = "AbortError";
      throw err;
    }

    if (useTxRef) {
      const result = await flwFetch<{
        status: string;
        data: FlutterwaveVerifyResponse["data"][];
      }>(buildEndpoint(), { signal });

      if (result.status !== "success" || !result.data?.length) {
        throw new FlutterwaveError(
          "No transaction was found for this id",
          400,
          result
        );
      }
      return { status: "success", data: result.data[0] };
    }

    return flwFetch<FlutterwaveVerifyResponse>(
      buildEndpoint(),
      { signal }                            // ← PASS signal
    );
  }

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // ✅ Check abort at start of each retry loop too
    if (signal?.aborted) {
      const err = new Error("Verification aborted");
      err.name = "AbortError";
      throw err;
    }

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

      if (err instanceof Error && err.name === "AbortError") {
        throw err;
      }

      const isNotFound = err instanceof FlutterwaveError && err.isNotFound;

      if (!retryOnNotFound || !isNotFound || attempt === maxRetries) {
        break;
      }

      // Exponential backoff: 5s → 10s → 20s
      const delay = initialDelayMs * Math.pow(2, attempt);
      console.warn(
        `[Flutterwave] Transaction ${transactionId} not found ` +
        `(attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay / 1000}s...`
      );

      await abortableSleep(delay, signal);
    }
  }

  throw lastError;
}

// ─── Abortable sleep ──────────────────────────────────────────────────────────
// Regular sleep() ignores abort signal — this one resolves early when aborted

function abortableSleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      const err = new Error("Aborted");
      err.name = "AbortError";
      return reject(err);
    }

    const timer = setTimeout(resolve, ms);

    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      const err = new Error("Aborted");
      err.name = "AbortError";
      reject(err);
    }, { once: true });
  });
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
  // per FLW docs for hosted checkout webhooks.
  //
  // FIX: crypto.timingSafeEqual() throws a RangeError when the two buffers
  // have different byte lengths — it does NOT return false.
  // This was crashing the webhook silently, causing Flutterwave to receive
  // a 500 instead of a 401, and retry indefinitely.
  //
  // Solution: length-check first, then compare.
  // We still use timingSafeEqual (not ===) to prevent timing attacks.
  try {
    const sigBuf = Buffer.from(signature, "utf8");
    const secretBuf = Buffer.from(secret, "utf8");

    // Different lengths → definitely not equal.
    // Return false directly — comparing buffers of different lengths
    // with timingSafeEqual would throw.
    if (sigBuf.length !== secretBuf.length) {
      console.warn("[Flutterwave] Webhook signature length mismatch", {
        signatureLength: sigBuf.length,
        secretLength: secretBuf.length,
      });
      return false;
    }

    const isValid = crypto.timingSafeEqual(sigBuf, secretBuf);

    if (!isValid) {
      console.warn("[Flutterwave] Webhook signature mismatch");
    }

    return isValid;
  } catch (err) {
    // Catch any unexpected errors from timingSafeEqual so the webhook
    // never crashes — always return false instead of throwing.
    console.error("[Flutterwave] Webhook signature comparison error", {
      reason: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
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