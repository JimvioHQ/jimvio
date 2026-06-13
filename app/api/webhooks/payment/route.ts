/**
 * app/api/webhooks/payment/route.ts
 *
 * UNIFIED PAYMENT WEBHOOK HANDLER
 * ================================
 * Single endpoint that handles webhooks from all payment providers:
 *   Flutterwave · PayPal · NowPayments · PesaPal · AfriPay · PawaPay
 *
 * Usage — configure each provider's dashboard to POST/GET to:
 *   https://your-domain/api/webhooks/payment?provider=<name>
 *
 * ?provider query param is the fallback. Auto-detection via headers
 * is attempted first (Flutterwave, PayPal, NowPayments are auto-detected).
 *
 * Flow:
 *   1. Detect provider → verify signature → normalize to PaymentEvent
 *   2. Idempotency check via webhook_events table
 *   3. If status == paid  → finalizeOrderPayment OR finalizeCommunityPayment
 *   4. If status == failed → mark order failed
 *   5. Log result
 *
 * Design guarantees:
 *   - Idempotent  : same event processed at most once (idempotency_key)
 *   - No data loss: wallet credit is atomic with transaction record
 *   - Amount guard: paid amount is validated against order.total_amount
 *   - Safe        : non-200 responses tell providers to retry → handled
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import {
  detectProvider,
  getProviderVerifier,
  type PaymentEvent,
} from "@/lib/payments/provider-verifiers";
import {
  logWebhookEvent,
  markWebhookProcessed,
  markWebhookFailed,
} from "@/lib/payments/webhook-logger";
import { finalizeOrderPayment } from "@/lib/payments/finalize-order-payment";
import { finalizeCommunityPayment } from "@/lib/payments/community-payment-finalizer";
import { verifyPesapalTransaction } from "@/lib/pesapal";
import { verifyFlutterwaveTransaction } from "@/lib/flutterwave";

export const dynamic = "force-dynamic";

// Supabase admin client (service role — never expose to browser)
function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// ---------------------------------------------------------------------------
// POST — used by Flutterwave, PayPal, NowPayments, AfriPay, PawaPay
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  return handleWebhook(req, "POST");
}

// ---------------------------------------------------------------------------
// GET  — used by PesaPal IPN (redirect-based callback)
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  return handleWebhook(req, "GET");
}

// ---------------------------------------------------------------------------
// Core handler
// ---------------------------------------------------------------------------
async function handleWebhook(req: NextRequest, method: "GET" | "POST") {
  const url = new URL(req.url);

  // 1. Capture raw body (GET: serialize query params as JSON)
  let rawBody: string;
  if (method === "GET") {
    const params: Record<string, string> = {};
    url.searchParams.forEach((v, k) => (params[k] = v));
    rawBody = JSON.stringify(params);
  } else {
    rawBody = await req.text();
  }

  // 2. Detect provider
  const providerParam = url.searchParams.get("provider")?.toLowerCase();
  const detectedProvider = detectProvider(req.headers) ?? providerParam ?? null;

  if (!detectedProvider) {
    console.warn("[webhook/payment] Cannot detect provider");
    return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
  }

  const verifier = getProviderVerifier(detectedProvider);
  if (!verifier) {
    console.warn(`[webhook/payment] No verifier for provider: ${detectedProvider}`);
    return NextResponse.json({ error: "Unsupported provider" }, { status: 400 });
  }

  // 3. Verify + normalize
  const result = await verifier(req.headers, rawBody);
  if (!result.ok) {
    console.warn(`[webhook/payment][${detectedProvider}] Verification failed: ${result.reason}`);
    return NextResponse.json({ error: result.reason }, { status: result.status });
  }

  const event = result.event;

  // 4. Early exit for non-actionable events
  if (event.status === "ignored") {
    return NextResponse.json({ received: true });
  }

  const db = getDb();

  // 5. Idempotency check
  const { isDuplicate, eventId } = await logWebhookEvent(db, {
    provider: event.provider,
    idempotencyKey: event.idempotencyKey,
    payload: JSON.parse(rawBody),
    orderId: event.jimvioOrderId ?? null,
  });

  if (isDuplicate) {
    console.log(`[webhook/payment] Duplicate event, skipping: ${event.idempotencyKey}`);
    return NextResponse.json({ received: true, duplicate: true });
  }

  // 6. Handle failed payments
  if (event.status === "failed") {
    await handleFailedPayment(db, event);
    if (eventId) await markWebhookProcessed(db, eventId);
    return NextResponse.json({ received: true });
  }

  // 7. For pending events — just log and return
  if (event.status === "pending") {
    return NextResponse.json({ received: true });
  }

  // 8. Payment is PAID — do secondary verification for providers that allow it
  try {
    const verified = await secondaryVerify(event);
    if (!verified) {
      console.warn(`[webhook/payment][${event.provider}] Secondary verification failed`, event.idempotencyKey);
      if (eventId) await markWebhookFailed(db, eventId, "Secondary verification failed");
      return NextResponse.json({ received: true });
    }
  } catch (e) {
    // Don't block on secondary verify errors — log and continue
    console.error(`[webhook/payment][${event.provider}] Secondary verify error`, e);
  }

  // 9. Resolve jimvioOrderId if provider-specific lookup needed
  const resolvedOrderId = await resolveOrderId(db, event);

  // 10. Check if this is a community payment
  if (event.communityId && event.userId) {
    await processCommunityPayment(db, event, eventId);
    return NextResponse.json({ received: true });
  }

  // 11. Process marketplace order
  if (!resolvedOrderId) {
    console.warn(`[webhook/payment][${event.provider}] Order not found`, event.idempotencyKey);
    if (eventId) await markWebhookFailed(db, eventId, "Order not found");
    return NextResponse.json({ received: true });
  }

  await processOrderPayment(db, event, resolvedOrderId, eventId);
  return NextResponse.json({ received: true });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Secondary verification — calls provider API to confirm the transaction
 * is genuinely paid before touching the database. Reduces fraud surface.
 */
async function secondaryVerify(event: PaymentEvent): Promise<boolean> {
  if (event.provider === "flutterwave" && event.providerTransactionId) {
    try {
      const tx = await verifyFlutterwaveTransaction(event.providerTransactionId);
      return tx.status === "successful";
    } catch {
      return true; // Don't block on network errors
    }
  }

  if (event.provider === "pesapal" && event.providerTransactionId) {
    try {
      const status = await verifyPesapalTransaction(event.providerTransactionId);
      const code = String(status.status_code ?? "").toUpperCase();
      return code === "1" || code === "COMPLETED";
    } catch {
      return true;
    }
  }

  // Other providers verified via signature — trust them
  return true;
}

/**
 * Resolve the Jimvio order UUID.
 * Some providers (AfriPay, PawaPay) don't embed orderId in the webhook;
 * we look up by payment_external_reference.
 */
async function resolveOrderId(
  db: ReturnType<typeof getDb>,
  event: PaymentEvent
): Promise<string | null> {
  if (event.jimvioOrderId) {
    // Validate it exists in DB
    const { data } = await db
      .from("orders")
      .select("id")
      .eq("id", event.jimvioOrderId)
      .maybeSingle();
    return data?.id ?? null;
  }

  // Provider-specific fallbacks
  if (event.provider === "pawapay") {
    // PawaPay deposit ID is stored in pawapay_deposit_id (set at checkout initiation)
    const { data } = await db
      .from("orders")
      .select("id")
      .eq("pawapay_deposit_id", event.providerTransactionId)
      .maybeSingle();
    if (data?.id) return data.id;
  }

  // Generic fallback: lookup by external reference (AfriPay uses transactionId as ref)
  const { data } = await db
    .from("orders")
    .select("id")
    .eq("payment_external_reference", event.providerTransactionId)
    .maybeSingle();

  return data?.id ?? null;
}

/** Mark an order as failed */
async function handleFailedPayment(
  db: ReturnType<typeof getDb>,
  event: PaymentEvent
): Promise<void> {
  const orderId = event.jimvioOrderId;
  if (!orderId) return;

  await db
    .from("orders")
    .update({
      payment_status: "failed",
      status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .neq("payment_status", "completed"); // Never downgrade a completed order
}

/** Finalize a marketplace order payment */
async function processOrderPayment(
  db: ReturnType<typeof getDb>,
  event: PaymentEvent,
  orderId: string,
  eventId: string | null
): Promise<void> {
  try {
    // Guard: skip if already completed
    const { data: order } = await db
      .from("orders")
      .select("payment_status, total_amount, currency, buyer_id")
      .eq("id", orderId)
      .single();

    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    if (order.payment_status === "completed") {
      console.log(`[webhook/payment] Order already completed: ${orderId}`);
      if (eventId) await markWebhookProcessed(db, eventId, orderId);
      return;
    }

    // Amount validation — strict for matching checkout currency
    if (event.amount != null && order.total_amount != null) {
      const expected = Number(order.total_amount);
      const received = Number(event.amount);
      const orderCurrency = (order.currency ?? "RWF").toString().toUpperCase();
      const eventCurrency = event.currency?.toString().toUpperCase();

      if (eventCurrency && eventCurrency !== orderCurrency) {
        const message =
          `[webhook/payment] Currency mismatch order=${orderId} ` +
          `expected=${orderCurrency} received=${eventCurrency}`;
        console.error(message);
        throw new Error(message);
      }

      const amountsMatch = orderCurrency === "RWF"
        ? received === expected
        : Math.abs(received - expected) < 0.005;

      if (!amountsMatch) {
        const message =
          `[webhook/payment] Amount mismatch order=${orderId} ` +
          `expected=${expected} ${orderCurrency} received=${received} ${eventCurrency ?? orderCurrency}`;
        console.error(message);
        throw new Error(message);
      }
    }

    await finalizeOrderPayment(db, orderId, {
      providerTransactionId: event.providerTransactionId,
      providerReference: event.idempotencyKey,
      paidAtIso: new Date().toISOString(),
      notifyUserId: order.buyer_id ?? null,
      paymentProvider: event.provider,
      webhookReference: event.idempotencyKey,
    });

    // Stamp gateway_used
    await db
      .from("orders")
      .update({
        gateway_used: event.provider,
        payment_provider: event.provider,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    console.log(`[webhook/payment] ✓ Order finalized: ${orderId} via ${event.provider}`);
    if (eventId) await markWebhookProcessed(db, eventId, orderId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[webhook/payment] ✗ Failed to finalize order ${orderId}:`, msg);
    if (eventId) await markWebhookFailed(db, eventId, msg);
    // Re-throw so provider retries (return 500)
    throw e;
  }
}

/** Finalize a community subscription payment */
async function processCommunityPayment(
  db: ReturnType<typeof getDb>,
  event: PaymentEvent,
  eventId: string | null
): Promise<void> {
  if (!event.communityId || !event.userId || !event.planType) return;

  try {
    const result = await finalizeCommunityPayment(db, {
      communityId: event.communityId,
      userId: event.userId,
      planType: event.planType,
      amount: event.amount ?? 0,
      currency: event.currency ?? "USD",
      paymentProvider: event.provider,
      paymentReference: event.providerTransactionId,
    });

    console.log(
      `[webhook/payment] ✓ Community payment processed: ${event.communityId} ` +
        `skipped=${result.skipped} creator=${result.creatorEarnings}`
    );
    if (eventId) await markWebhookProcessed(db, eventId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[webhook/payment] ✗ Community payment failed:`, msg);
    if (eventId) await markWebhookFailed(db, eventId, msg);
    throw e;
  }
}
