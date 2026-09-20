/**
 * lib/payments/provider-verifiers.ts
 *
 * Provider-specific signature verification + payload normalisation.
 * Each verifier returns a normalised `PaymentEvent` so the unified
 * webhook handler never needs to touch raw provider formats.
 *
 * Adding a new provider:
 *   1. Write a `verify<Provider>` function matching `ProviderVerifier`.
 *   2. Register it in `PROVIDER_VERIFIERS`.
 *   3. Done — no changes needed in the unified handler.
 */

import crypto from "crypto";
import {
  validateFlutterwaveWebhookRequest,
  isFlutterwaveSuccessfulStatus,
  flutterwaveWebhookSecretConfigured,
} from "@/lib/flutterwave";
import { getNowPaymentsIpnSecret } from "@/lib/nowpayments";
import { isRetiredPaymentProvider } from "@/lib/payments/retired-providers";

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export type PaymentEventStatus = "paid" | "failed" | "pending" | "ignored";

/** Normalised event emitted by every provider verifier */
export interface PaymentEvent {
  provider: string;
  /** Globally unique transaction ID from the provider */
  providerTransactionId: string;
  /** Our Jimvio order UUID (may be missing for some providers) */
  jimvioOrderId?: string | null;
  /** Unique ref used as idempotency key — must not collide across providers */
  idempotencyKey: string;
  status: PaymentEventStatus;
  /** Verified paid amount in the stated currency */
  amount?: number | null;
  currency?: string | null;
  /** For community subscription webhooks */
  communityId?: string | null;
  userId?: string | null;
  planType?: "monthly" | "yearly" | "lifetime" | null;
  /** Raw body string — passed through for audit logging */
  rawBody: string;
}

export type VerifyResult =
  | { ok: true; event: PaymentEvent }
  | { ok: false; reason: string; status: number };

export type ProviderVerifier = (
  headers: Headers,
  rawBody: string
) => Promise<VerifyResult>;

// ---------------------------------------------------------------------------
// Flutterwave
// ---------------------------------------------------------------------------

function parseFlutterwavePayload(rawBody: string): {
  txRef?: string;
  txId?: string;
  status?: string;
  amount?: number;
  currency?: string;
} | null {
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return null;
  }

  if (body.data && typeof body.data === "object" && !Array.isArray(body.data)) {
    const d = body.data as Record<string, unknown>;
    return {
      txRef: typeof d.tx_ref === "string" ? d.tx_ref : undefined,
      txId: d.id != null ? String(d.id) : undefined,
      status: typeof d.status === "string" ? d.status : undefined,
      amount: d.amount != null ? Number(d.amount) : undefined,
      currency: typeof d.currency === "string" ? d.currency : undefined,
    };
  }

  if (body.event && typeof body.event === "object" && !Array.isArray(body.event)) {
    const ev = body.event as Record<string, unknown>;
    const txRef =
      typeof ev.txRef === "string"
        ? ev.txRef
        : typeof ev.tx_ref === "string"
          ? ev.tx_ref
          : undefined;
    return {
      txRef,
      txId: ev.id != null ? String(ev.id) : undefined,
      status: typeof ev.status === "string" ? ev.status : undefined,
      amount: ev.amount != null ? Number(ev.amount) : undefined,
      currency: typeof ev.currency === "string" ? ev.currency : undefined,
    };
  }

  const txRef =
    typeof body.tx_ref === "string"
      ? body.tx_ref
      : typeof body.txRef === "string"
        ? body.txRef
        : undefined;

  if (txRef || body.id != null) {
    return {
      txRef,
      txId: body.id != null ? String(body.id) : undefined,
      status: typeof body.status === "string" ? body.status : undefined,
      amount: body.amount != null ? Number(body.amount) : undefined,
      currency: typeof body.currency === "string" ? body.currency : undefined,
    };
  }

  return null;
}

export const verifyFlutterwave: ProviderVerifier = async (headers, rawBody) => {
  if (!flutterwaveWebhookSecretConfigured()) {
    return { ok: false, reason: "Flutterwave webhook secret not configured", status: 500 };
  }
  if (!validateFlutterwaveWebhookRequest(headers, rawBody)) {
    return { ok: false, reason: "Invalid Flutterwave signature", status: 401 };
  }

  const txData = parseFlutterwavePayload(rawBody);
  if (!txData?.txRef) {
    const noopKey = crypto.createHash("sha256").update(rawBody || "empty").digest("hex").slice(0, 32);
    return {
      ok: true,
      event: {
        provider: "flutterwave",
        providerTransactionId: "unknown",
        idempotencyKey: `flw-noop-${noopKey}`,
        status: "ignored",
        rawBody,
      },
    };
  }

  const txId = txData.txId ?? txData.txRef;
  const rawStatus = (txData.status || "").toLowerCase();
  let status: PaymentEventStatus = "pending";
  if (isFlutterwaveSuccessfulStatus(rawStatus)) status = "paid";
  else if (rawStatus === "failed") status = "failed";

  return {
    ok: true,
    event: {
      provider: "flutterwave",
      providerTransactionId: txId,
      jimvioOrderId: null,
      idempotencyKey: `flw-${txId}`,
      status,
      amount: txData.amount ?? null,
      currency: txData.currency ?? null,
      rawBody,
    },
  };
};

// ---------------------------------------------------------------------------
// PayPal (retired — reject all new webhook processing)
// ---------------------------------------------------------------------------

export const verifyPayPal: ProviderVerifier = async (_headers, _rawBody) => {
  void _headers;
  void _rawBody;
  return {
    ok: false,
    reason: "PayPal is no longer available",
    status: 410,
  };
};

// ---------------------------------------------------------------------------
// NowPayments
// ---------------------------------------------------------------------------

export const verifyNowPayments: ProviderVerifier = async (headers, rawBody) => {
  const signature = headers.get("x-nowpayments-sig") ?? "";
  const secret = getNowPaymentsIpnSecret() ?? "";

  if (!secret) {
    return { ok: false, reason: "NOWPAYMENTS_IPN_SECRET not configured", status: 500 };
  }

  try {
    const parsed = JSON.parse(rawBody);
    const sortedString = JSON.stringify(
      Object.keys(parsed)
        .sort()
        .reduce((acc: Record<string, unknown>, key) => {
          acc[key] = parsed[key];
          return acc;
        }, {})
    );
    const expected = crypto
      .createHmac("sha512", secret)
      .update(sortedString)
      .digest("hex");
    const isValid = crypto.timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(signature, "hex")
    );
    if (!isValid) {
      return { ok: false, reason: "Invalid NowPayments signature", status: 401 };
    }

    const { payment_status, order_id, payment_id, price_amount, price_currency } = parsed as {
      payment_status: string;
      order_id: string;
      payment_id: number;
      price_amount?: number;
      price_currency?: string;
    };

    const rawStatus = (payment_status || "").toLowerCase();
    let status: PaymentEventStatus = "pending";
    if (rawStatus === "finished" || rawStatus === "confirmed") status = "paid";
    else if (["failed", "refunded", "expired"].includes(rawStatus)) status = "failed";

    const txId = String(payment_id);

    return {
      ok: true,
      event: {
        provider: "nowpayments",
        providerTransactionId: txId,
        jimvioOrderId: order_id ?? null,
        idempotencyKey: `nowp-${txId}-${rawStatus}`,
        status,
        amount: price_amount ?? null,
        currency: (price_currency ?? "USD").toUpperCase(),
        rawBody,
      },
    };
  } catch {
    return { ok: false, reason: "Signature verification failed", status: 400 };
  }
};

// ---------------------------------------------------------------------------
// PesaPal (retired — reject all new webhook processing)
// ---------------------------------------------------------------------------

export const verifyPesaPal: ProviderVerifier = async (_headers, _rawBody) => {
  void _headers;
  void _rawBody;
  return {
    ok: false,
    reason: "PesaPal is no longer available",
    status: 410,
  };
};

// ---------------------------------------------------------------------------
// AfriPay
// ---------------------------------------------------------------------------

export const verifyAfriPay: ProviderVerifier = async (headers, rawBody) => {
  void headers;
  let body: { transactionId?: string; status?: string } = {};
  try {
    body = JSON.parse(rawBody);
  } catch {
    return { ok: false, reason: "Invalid JSON", status: 400 };
  }

  const transactionId = body.transactionId?.trim();
  if (!transactionId) {
    return { ok: false, reason: "Missing transactionId", status: 400 };
  }

  // Fail closed: confirm with AfriPay API before marking paid.
  const { checkAfriPayStatus } = await import("@/lib/payments/afripay");
  const verified = await checkAfriPayStatus(transactionId);
  const rawStatus = (verified.status || "").toLowerCase();
  let status: PaymentEventStatus = "pending";
  if (rawStatus === "success" || rawStatus === "completed" || rawStatus === "paid") {
    status = "paid";
  } else if (rawStatus === "failed" || rawStatus === "cancelled") {
    status = "failed";
  }

  return {
    ok: true,
    event: {
      provider: "afripay",
      providerTransactionId: transactionId,
      jimvioOrderId: null, // resolved by DB lookup on payment_external_reference
      idempotencyKey: `afripay-${transactionId}-${status}`,
      status,
      rawBody,
    },
  };
};

// ---------------------------------------------------------------------------
// PawaPay
// ---------------------------------------------------------------------------

export const verifyPawaPay: ProviderVerifier = async (headers, rawBody) => {
  void headers;
  // PawaPay sends JSON callbacks with depositId + status
  let body: Record<string, unknown> = {};
  try {
    body = JSON.parse(rawBody);
  } catch {
    return { ok: false, reason: "Invalid JSON", status: 400 };
  }

  // depositId lives at top level or under .data
  const depositId =
    (typeof body.depositId === "string" ? body.depositId : null) ||
    (typeof (body.data as Record<string, unknown>)?.depositId === "string"
      ? ((body.data as Record<string, unknown>).depositId as string)
      : null);

  if (!depositId) {
    return {
      ok: true,
      event: {
        provider: "pawapay",
        providerTransactionId: "unknown",
        idempotencyKey: `pawapay-noop-${Date.now()}`,
        status: "ignored",
        rawBody,
      },
    };
  }

  // Fail closed: never trust callback body status alone.
  const { confirmPawaPayDepositCompleted } = await import(
    "@/lib/payments/confirm-pawapay-deposit"
  );
  const completed = await confirmPawaPayDepositCompleted(depositId);
  const status: PaymentEventStatus = completed ? "paid" : "pending";

  return {
    ok: true,
    event: {
      provider: "pawapay",
      providerTransactionId: depositId,
      jimvioOrderId: null, // resolved by DB lookup on pawapay_deposit_id in resolveOrderId
      idempotencyKey: `pawapay-${depositId}-${status}`,
      status,
      rawBody,
    },
  };
};

// ---------------------------------------------------------------------------
// Provider detection + registry
// ---------------------------------------------------------------------------

const PROVIDER_VERIFIERS: Record<string, ProviderVerifier> = {
  flutterwave: verifyFlutterwave,
  nowpayments: verifyNowPayments,
  afripay: verifyAfriPay,
  pawapay: verifyPawaPay,
};

/**
 * Auto-detect the payment provider from request headers.
 * Returns the provider key to look up in PROVIDER_VERIFIERS.
 * Retired providers (PesaPal/PayPal) are detected only so callers can reject them.
 */
export function detectProvider(headers: Headers): string | null {
  if (headers.get("verif-hash") || headers.get("flutterwave-signature")) {
    return "flutterwave";
  }

  if (headers.get("paypal-transmission-id")) return "paypal";

  if (headers.get("x-nowpayments-sig")) return "nowpayments";

  return null;
}

export function getProviderVerifier(provider: string): ProviderVerifier | null {
  if (isRetiredPaymentProvider(provider)) {
    return provider === "paypal" ? verifyPayPal : verifyPesaPal;
  }
  return PROVIDER_VERIFIERS[provider] ?? null;
}
