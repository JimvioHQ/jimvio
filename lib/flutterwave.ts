
import crypto from "crypto";

/* ── Config ─────────────────────────────────────────────────────── */

export function getFlutterwaveApiBaseUrl(): string {
  const fallback = "https://api.flutterwave.com/v3";
  const configured = process.env.FLW_BASE_URL?.trim();
  if (!configured) return fallback;

  // Never let a malformed or untrusted override break checkout or redirect
  // authorization headers to an unexpected host.
  try {
    const url = new URL(configured);
    if (
      url.protocol === "https:" &&
      url.hostname.toLowerCase() === "api.flutterwave.com" &&
      !url.username &&
      !url.password &&
      !url.port &&
      !url.search &&
      !url.hash &&
      (url.pathname === "" || url.pathname === "/" || url.pathname.replace(/\\/+$/, "") === "/v3")
    ) {
      return "https://api.flutterwave.com/v3";
    }
  } catch {
    // Fall through to the canonical provider endpoint.
  }

  console.warn("[Flutterwave] Ignoring invalid FLW_BASE_URL; using canonical v3 endpoint.");
  return fallback;
}

function getSecretKey(): string {
  const key = process.env.FLW_SECRET_KEY || process.env.FLUTTERWAVE_SECRET_KEY;
  if (!key) throw new Error("FLW_SECRET_KEY is not configured in .env");
  return key.trim().replace(/^["']|["']$/g, "");
}

function getWebhookSecretOrNull(): string | null {
  // Flutterwave calls this the "Secret hash" (Settings → Webhooks); accept the common names.
  const secret =
    process.env.FLW_WEBHOOK_SECRET ||
    process.env.FLUTTERWAVE_WEBHOOK_HASH ||
    process.env.FLW_SECRET_HASH ||
    process.env.FLW_WEBHOOK_HASH ||
    process.env.FLUTTERWAVE_SECRET_HASH ||
    process.env.FLUTTERWAVE_WEBHOOK_SECRET;
  if (!secret) return null;
  return secret.trim().replace(/^["']|["']$/g, "");
}

export function flutterwaveWebhookSecretConfigured(): boolean {
  return getWebhookSecretOrNull() != null;
}

function timingSafeStringEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, "utf8");
  const bBuf = Buffer.from(b, "utf8");
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

/** Flutterwave uses different status strings across API versions. */
export function isFlutterwaveSuccessfulStatus(
  status: string | null | undefined
): boolean {
  const normalized = (status ?? "").toLowerCase();
  return (
    normalized === "successful" ||
    normalized === "succeeded" ||
    normalized === "completed"
  );
}

export function isFlutterwaveRefundStatus(
  status: string | null | undefined,
  eventName?: string | null
): boolean {
  const normalized = `${status ?? ""} ${eventName ?? ""}`.toLowerCase();
  return (
    normalized.includes("refund") ||
    normalized.includes("reversed") ||
    normalized.includes("chargeback")
  );
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
  const url = `${getFlutterwaveApiBaseUrl()}${endpoint}`;

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
  // Already looks international (country code + number).
  if (cleaned.length >= 11) return `+${cleaned}`;
  // Short local numbers: treat as Rwanda only when clearly local.
  if (cleaned.startsWith("0") && cleaned.length <= 10) return `+250${cleaned.slice(1)}`;
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
  /** Override merchant default country (e.g. RW for Rwanda MoMo, US for USD card). */
  country?: string;
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
  const raw = Number(params.amount);

  if (!Number.isFinite(raw) || raw <= 0) {
    throw new FlutterwaveError("Invalid payment amount", 400);
  }
  // Flutterwave expects 2dp for USD/card rails.
  const amount = Math.round(Math.max(minAmount, raw) * 100) / 100;
  const phone = formatPhone(params.customerPhone);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  const country =
    params.country?.trim().toUpperCase() || getCountryCode(currency) || undefined;
  const paymentOptions = params.paymentOptions ?? getPaymentOptions(currency);

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
    payment_options: paymentOptions,
    ...(country && { country }),
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
    country: country ?? null,
    paymentOptions,
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
    signal?: AbortSignal;
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
      return `/transactions/verify_by_reference?tx_ref=${encodeURIComponent(String(transactionId))}`;
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
      const sorted = result.data.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      const best = sorted.find((t) => t.status === "successful") ?? sorted[0];
      return { status: "success", data: best };
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

/**
 * Validate an incoming Flutterwave webhook request.
 * Supports:
 * - v4 `flutterwave-signature` (HMAC-SHA256 of raw body, base64 or hex)
 * - legacy `verif-hash` (direct Secret Hash comparison)
 */
export function validateFlutterwaveWebhookRequest(
  headers: Headers,
  rawBody: string
): boolean {
  const secret = getWebhookSecretOrNull();
  if (!secret) {
    console.error("[Flutterwave] Webhook secret not configured");
    return false;
  }

  const hmacSignature = headers.get("flutterwave-signature");
  if (hmacSignature) {
    const base64 = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("base64");
    const hex = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");

    if (
      timingSafeStringEqual(hmacSignature, base64) ||
      timingSafeStringEqual(hmacSignature, hex)
    ) {
      return true;
    }
  }

  const verifHash = headers.get("verif-hash");
  if (verifHash && timingSafeStringEqual(verifHash, secret)) {
    return true;
  }

  if (hmacSignature || verifHash) {
    console.warn("[Flutterwave] Webhook signature mismatch", {
      hasHmac: !!hmacSignature,
      hasVerifHash: !!verifHash,
    });
  } else {
    console.warn("[Flutterwave] Webhook received with no signature headers");
  }

  return false;
}

/** @deprecated Prefer validateFlutterwaveWebhookRequest(headers, rawBody). */
export function validateFlutterwaveWebhook(
  rawBody: string,
  signature: string | null
): boolean {
  if (!signature) {
    console.warn("[Flutterwave] Webhook received with no signature");
    return false;
  }

  const headers = new Headers();
  headers.set("verif-hash", signature);
  if (validateFlutterwaveWebhookRequest(headers, rawBody)) {
    return true;
  }

  headers.delete("verif-hash");
  headers.set("flutterwave-signature", signature);
  return validateFlutterwaveWebhookRequest(headers, rawBody);
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