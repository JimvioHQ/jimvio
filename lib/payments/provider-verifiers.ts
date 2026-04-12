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
import { validatePayPalWebhook } from "@/lib/paypal";

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

export const verifyFlutterwave: ProviderVerifier = async (headers, rawBody) => {
  const signature = headers.get("verif-hash");
  const secret = (
    process.env.FLW_WEBHOOK_SECRET || process.env.FLUTTERWAVE_WEBHOOK_HASH || ""
  )
    .trim()
    .replace(/^["']|["']$/g, "");

  if (!secret) {
    return { ok: false, reason: "FLW_WEBHOOK_SECRET not configured", status: 500 };
  }
  if (!signature || signature !== secret) {
    return { ok: false, reason: "Invalid Flutterwave signature", status: 401 };
  }

  let body: {
    event?: string;
    data?: {
      id?: number;
      tx_ref?: string;
      status?: string;
      amount?: number;
      currency?: string;
      meta?: Record<string, unknown>;
    };
  };
  try {
    body = JSON.parse(rawBody);
  } catch {
    return { ok: false, reason: "Invalid JSON", status: 400 };
  }

  const txData = body.data;
  if (!txData?.tx_ref) {
    return { ok: true, event: { provider: "flutterwave", providerTransactionId: "unknown", idempotencyKey: `flw-noop-${Date.now()}`, status: "ignored", rawBody } };
  }

  const txId = String(txData.id ?? txData.tx_ref);
  const rawStatus = (txData.status || "").toLowerCase();
  let status: PaymentEventStatus = "pending";
  if (rawStatus === "successful") status = "paid";
  else if (rawStatus === "failed") status = "failed";

  // Pull jimvioOrderId from tx_ref (we set tx_ref = orderId at checkout)
  const jimvioOrderId = txData.tx_ref || null;

  return {
    ok: true,
    event: {
      provider: "flutterwave",
      providerTransactionId: txId,
      jimvioOrderId,
      idempotencyKey: `flw-${txId}`,
      status,
      amount: txData.amount ?? null,
      currency: txData.currency ?? null,
      rawBody,
    },
  };
};

// ---------------------------------------------------------------------------
// PayPal
// ---------------------------------------------------------------------------

export const verifyPayPal: ProviderVerifier = async (headers, rawBody) => {
  if (process.env.PAYPAL_WEBHOOK_ID) {
    const hdrMap: Record<string, string | undefined> = {
      "paypal-auth-algo": headers.get("paypal-auth-algo") ?? undefined,
      "paypal-cert-url": headers.get("paypal-cert-url") ?? undefined,
      "paypal-transmission-id": headers.get("paypal-transmission-id") ?? undefined,
      "paypal-transmission-sig": headers.get("paypal-transmission-sig") ?? undefined,
      "paypal-transmission-time": headers.get("paypal-transmission-time") ?? undefined,
    };
    const isValid = await validatePayPalWebhook(hdrMap, rawBody);
    if (!isValid) {
      return { ok: false, reason: "Invalid PayPal webhook signature", status: 401 };
    }
  }

  let event: {
    event_type?: string;
    resource?: {
      id?: string;
      custom_id?: string;
      status?: string;
      purchase_units?: Array<{ custom_id?: string }>;
    };
  };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return { ok: false, reason: "Invalid JSON", status: 400 };
  }

  const eventType = event.event_type || "";
  const resourceId = event.resource?.id ?? "unknown";
  const jimvioOrderId =
    event.resource?.custom_id ||
    event.resource?.purchase_units?.[0]?.custom_id ||
    null;

  let status: PaymentEventStatus = "ignored";

  if (eventType === "PAYMENT.CAPTURE.COMPLETED") {
    status = "paid";
  } else if (
    eventType === "PAYMENT.CAPTURE.DENIED" ||
    eventType === "CHECKOUT.ORDER.VOIDED"
  ) {
    status = "failed";
  } else if (eventType === "CHECKOUT.ORDER.APPROVED") {
    // We handle capture separately; treat as pending here
    status = "pending";
  }

  return {
    ok: true,
    event: {
      provider: "paypal",
      providerTransactionId: resourceId,
      jimvioOrderId,
      idempotencyKey: `paypal-${resourceId}-${eventType}`,
      status,
      rawBody,
    },
  };
};

// ---------------------------------------------------------------------------
// NowPayments
// ---------------------------------------------------------------------------

export const verifyNowPayments: ProviderVerifier = async (headers, rawBody) => {
  const signature = headers.get("x-nowpayments-sig") ?? "";
  const secret = process.env.NOWPAYMENTS_IPN_SECRET ?? "";

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
// PesaPal
// ---------------------------------------------------------------------------

export const verifyPesaPal: ProviderVerifier = async (headers, rawBody) => {
  // PesaPal sends GET callbacks, so rawBody will be empty for IPN.
  // The unified handler should route GET requests here too.
  // The actual verification is done by calling the PesaPal API.
  // We trust the request if the params are structurally valid.
  void headers;

  let parsed: Record<string, string> = {};
  try {
    // Could be JSON body (POST) or query params (passed as JSON by the handler)
    parsed = JSON.parse(rawBody) as Record<string, string>;
  } catch {
    return { ok: false, reason: "Invalid payload", status: 400 };
  }

  const orderTrackingId =
    parsed.OrderTrackingId || parsed.order_tracking_id || parsed.orderTrackingId;
  const merchantRef =
    parsed.OrderMerchantReference || parsed.order_merchant_reference || parsed.merchantRef;

  if (!orderTrackingId || !merchantRef) {
    return { ok: true, event: { provider: "pesapal", providerTransactionId: "unknown", idempotencyKey: `pp-noop-${Date.now()}`, status: "ignored", rawBody } };
  }

  const jimvioOrderId = merchantRef.split(":")[0] || null;

  return {
    ok: true,
    event: {
      provider: "pesapal",
      providerTransactionId: orderTrackingId,
      jimvioOrderId,
      idempotencyKey: `pesapal-${orderTrackingId}`,
      status: "pending", // Actual status resolved by calling PesaPal API in the handler
      rawBody,
    },
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

  const rawStatus = (body.status || "").toLowerCase();
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
      idempotencyKey: `afripay-${transactionId}`,
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

  const rawStatus =
    (typeof body.status === "string" ? body.status : "") ||
    (typeof (body.data as Record<string, unknown>)?.status === "string"
      ? ((body.data as Record<string, unknown>).status as string)
      : "");

  if (!depositId) {
    return { ok: true, event: { provider: "pawapay", providerTransactionId: "unknown", idempotencyKey: `pawapay-noop-${Date.now()}`, status: "ignored", rawBody } };
  }

  const upperStatus = rawStatus.toUpperCase();
  let status: PaymentEventStatus = "pending";
  if (upperStatus === "COMPLETED") status = "paid";
  else if (upperStatus === "FAILED") status = "failed";

  return {
    ok: true,
    event: {
      provider: "pawapay",
      providerTransactionId: depositId,
      jimvioOrderId: null, // resolved by DB lookup on pawapay_deposit_id in resolveOrderId
      idempotencyKey: `pawapay-${depositId}`,
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
  paypal: verifyPayPal,
  nowpayments: verifyNowPayments,
  pesapal: verifyPesaPal,
  afripay: verifyAfriPay,
  pawapay: verifyPawaPay,
};

/**
 * Auto-detect the payment provider from request headers.
 * Returns the provider key to look up in PROVIDER_VERIFIERS.
 */
export function detectProvider(headers: Headers): string | null {
  // Flutterwave: uses verif-hash header
  if (headers.get("verif-hash")) return "flutterwave";

  // PayPal: uses paypal-transmission-id
  if (headers.get("paypal-transmission-id")) return "paypal";

  // NowPayments: uses x-nowpayments-sig
  if (headers.get("x-nowpayments-sig")) return "nowpayments";

  return null;
}

export function getProviderVerifier(provider: string): ProviderVerifier | null {
  return PROVIDER_VERIFIERS[provider] ?? null;
}
