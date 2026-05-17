import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { verifyFlutterwaveTransaction } from "@/lib/flutterwave";
import { finalizeOrderPayment } from "@/lib/payments/finalize-order-payment";
import {
  markWebhookProcessed,
  markWebhookFailed,
  logWebhookEvent,
} from "@/lib/payments/webhook-logger";

export const dynamic = "force-dynamic";

// ─── Supabase ─────────────────────────────────────────────────────────────────

function getSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env vars are not configured");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function validateFlutterwaveWebhook(
  rawBody: string,
  headers: Headers
): boolean {
  const secret = process.env.FLW_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[webhook] FLW_WEBHOOK_SECRET is not set");
    return false;
  }

  // v4: HMAC-SHA256 via flutterwave-signature header
  const hmacSignature = headers.get("flutterwave-signature");
  if (hmacSignature) {
    const computed = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("base64");
    try {
      return crypto.timingSafeEqual(
        Buffer.from(computed),
        Buffer.from(hmacSignature)
      );
    } catch {
      return false;
    }
  }

  
  const verifHash = headers.get("verif-hash");
  if (verifHash) {
    return verifHash === secret;
  }

  console.warn("[webhook] No signature header found");
  return false;
}

interface NormalisedPayload {
  eventName: string;
  txRef: string | null;
  txId: number | null;
  status: string | null;
  amount: number | null;
  currency: string | null;
  rawTxData: Record<string, unknown>;
}

function normalisePayload(body: Record<string, unknown>): NormalisedPayload {
  console.info("[Flutterwave webhook] Event received", body);
  // ── v3 shape ──
  // { event: { id, txRef, status, amount, currency, "event.type": "BANK_TRANSFER_TRANSACTION" } }
  if (body.event && typeof body.event === "object" && !Array.isArray(body.event)) {
    const ev = body.event as Record<string, unknown>;
    console.info("[Flutterwave webhook] Event parsed", {
      type: "v3",
      body,
    });
    return {
      eventName: (ev["event.type"] as string) ?? "charge.completed",
      txRef: (ev.txRef as string) ?? null,
      txId: ev.id != null && Number.isFinite(Number(ev.id)) ? Number(ev.id) : null,
      status: (ev.status as string) ?? null,
      amount: ev.amount != null ? Number(ev.amount) : null,
      currency: (ev.currency as string) ?? null,
      rawTxData: ev,
    };
  }

  // ── v4 shape ──
  // { type: "charge.completed", data: { id, tx_ref, status, amount, currency } }
  if (body.data && typeof body.data === "object" && !Array.isArray(body.data)) {
    const d = body.data as Record<string, unknown>;
    console.info("[Flutterwave webhook] Event parsed", {
      type: "v4",
      body,
    });
    return {
      eventName: (body.type as string) ?? (body.event as string) ?? "charge.completed",
      txRef: (d.tx_ref as string) ?? null,
      txId: d.id != null && Number.isFinite(Number(d.id)) ? Number(d.id) : null,
      status: (d.status as string) ?? null,
      amount: d.amount != null ? Number(d.amount) : null,
      currency: (d.currency as string) ?? null,
      rawTxData: d,
    };
  }

  // ── flat shape ──
  // Transaction fields are directly at the root
  if (body.txRef !== undefined || body.tx_ref !== undefined || body["event.type"] !== undefined) {
    console.info("[Flutterwave webhook] Event parsed", {
      type: "flat",
      body,
    });
    return {
      eventName: (body["event.type"] as string) ?? (body.type as string) ?? (body.event as string) ?? "charge.completed",
      txRef: (body.txRef as string) ?? (body.tx_ref as string) ?? null,
      txId: body.id != null && Number.isFinite(Number(body.id)) ? Number(body.id) : null,
      status: (body.status as string) ?? null,
      amount: body.amount != null ? Number(body.amount) : null,
      currency: (body.currency as string) ?? null,
      rawTxData: body,
    };
  }

  // Unknown shape — return empty so the handler can bail out gracefully
  return {
    eventName: "unknown",
    txRef: null,
    txId: null,
    status: null,
    amount: null,
    currency: null,
    rawTxData: {},
  };
}

// ─── GET — health check ───────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const adminKey = req.headers.get("x-admin-key");
  if (adminKey !== process.env.ADMIN_SECRET_KEY) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }
  return NextResponse.json({
    ok: true,
    message: "Flutterwave webhook endpoint is reachable",
    ts: new Date().toISOString(),
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function resolveByTxRef(
  supabase: SupabaseClient,
  txRef: string
): Promise<{ orderId: string; transactionId: string } | null> {
  const { data, error } = await supabase
    .from("transactions")
    .select("id, order_id")
    .eq("provider", "flutterwave")
    .eq("provider_transaction_id", txRef)
    .limit(1) // FIX #9: guard against duplicate rows throwing on maybeSingle
    .maybeSingle();

  if (error) {
    console.error("[webhook] resolveByTxRef error", { reason: error.message, txRef });
    return null;
  }

  if (!data?.order_id) {
    console.warn("[webhook] No transaction found for tx_ref", { txRef });
    return null;
  }

  return { orderId: data.order_id, transactionId: data.id };
}

// creditVendorWallet removed: now handled by PostgreSQL trigger (on_order_completed_credit_wallets)

async function logWebhookIdempotent(
  supabase: SupabaseClient,
  params: {
    provider: string;
    idempotencyKey: string;
    payload: unknown;
    orderId: string | null;
  }
): Promise<{ eventId: string | null; isDuplicate: boolean; rpcFailed: boolean }> {
  try {
    const result = await logWebhookEvent(supabase, {
      provider: params.provider,
      idempotencyKey: params.idempotencyKey,
      payload: params.payload,
      orderId: params.orderId,
    });

    // If eventId is null, it means the insert failed (e.g. DB error)
    if (!result.eventId && !result.isDuplicate) {
      console.error("[webhook] logWebhookEvent failed to insert row");
      return { eventId: null, isDuplicate: false, rpcFailed: true };
    }

    return {
      eventId: result.eventId,
      isDuplicate: result.isDuplicate,
      rpcFailed: false,
    };
  } catch (error) {
    console.error("[webhook] logWebhookEvent exception", { reason: error instanceof Error ? error.message : String(error) });
    return { eventId: null, isDuplicate: false, rpcFailed: true };
  }
}

function isOrderFinalized(paymentStatus: string | null | undefined): boolean {
  return paymentStatus === "completed" || paymentStatus === "paid";
}

// ─── POST handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // 1. Read raw body FIRST — stream is consumed after first read
  const rawBody = await req.text();

  console.info("[Flutterwave webhook] Incoming request", {
    bodyLength: rawBody.length,
    hasSignatureV4: !!req.headers.get("flutterwave-signature"),
    hasSignatureLegacy: !!req.headers.get("verif-hash"),
    secretPresent: !!process.env.FLW_WEBHOOK_SECRET, // FIX #1: was FLUTTERWAVE_WEBHOOK_SECRET
    contentType: req.headers.get("content-type"),
  });

  // 3. Signature validation
  if (!validateFlutterwaveWebhook(rawBody, req.headers)) {
    console.warn("[Flutterwave webhook] ✗ Signature validation failed");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.info("[Flutterwave webhook] ✓ Signature valid");

  // 4. Parse + normalise payload — handles both v3 and v4 shapes
  let rawParsed: Record<string, unknown>;
  try {
    rawParsed = JSON.parse(rawBody);
  } catch {
    console.error("[Flutterwave webhook] Invalid JSON body");
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { eventName, txRef, txId, status, amount, currency, rawTxData } =
    normalisePayload(rawParsed);

  console.info("[Flutterwave webhook] Event parsed", {
    eventName,
    txRef,
    txId,
    status,
    amount,
    currency,
  });

  if (!txRef) {
    console.warn("[Flutterwave webhook] No txRef in payload — ignoring");
    return NextResponse.json({ received: true });
  }

  const supabase = getSupabase();

  // 5. Handle explicit failure events
  if (status === "failed") {
    const failureKey = `flw-fail-${txRef}`;
    const { isDuplicate: isFailDuplicate, rpcFailed } = await logWebhookIdempotent(
      supabase,
      { provider: "flutterwave", idempotencyKey: failureKey, payload: rawParsed, orderId: null }
    );

    if (rpcFailed) {

      console.error("[Flutterwave webhook] Idempotency RPC failed on failure path");
      return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }

    if (isFailDuplicate) {
      console.info("[Flutterwave webhook] Duplicate failure event — skipping", { failureKey });
      return NextResponse.json({ received: true, duplicate: true });
    }

    const resolved = await resolveByTxRef(supabase, txRef);
    if (resolved) {
      const { orderId, transactionId } = resolved;
      const { data: existingOrder } = await supabase
        .from("orders")
        .select("id, payment_status, buyer_id")
        .eq("id", orderId)
        .single();

      if (existingOrder && !isOrderFinalized(existingOrder.payment_status)) {
        await Promise.all([
          supabase
            .from("orders")
            .update({ payment_status: "failed", status: "cancelled", updated_at: new Date().toISOString() })
            .eq("id", orderId),
          supabase
            .from("transactions")
            .update({ status: "failed", updated_at: new Date().toISOString() })
            .eq("id", transactionId),
          existingOrder.buyer_id
            ? supabase.from("notifications").insert({
              user_id: existingOrder.buyer_id,
              type: "payment",
              title: "Payment Failed",
              message: "Your payment could not be processed. Please try again.",
              action_url: `/checkout?order=${orderId}`,
            })
            : Promise.resolve(),
        ]);
      }
    }

    return NextResponse.json({ received: true });
  }

  // 6. Ignore non-successful events
  if (status !== "successful") {
    console.info("[Flutterwave webhook] Non-successful status — ignoring", { status });
    return NextResponse.json({ received: true });
  }

  // 7. Idempotency check
  const idempotencyKey = txId ? `flw-${txId}` : `flw-ref-${txRef}`;
  const { eventId, isDuplicate, rpcFailed } = await logWebhookIdempotent(supabase, {
    provider: "flutterwave",
    idempotencyKey,
    payload: rawParsed,
    orderId: null,
  });

  if (rpcFailed) {
    // FIX #4: Without idempotency guarantee, refuse to process — Flutterwave will retry
    console.error("[Flutterwave webhook] Idempotency RPC failed — returning 500 for retry");
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  if (isDuplicate) {
    console.info("[Flutterwave webhook] Duplicate — already processed", { idempotencyKey });
    return NextResponse.json({ received: true, duplicate: true });
  }

  // 8. Secondary verification with 8s timeout
  if (txId != null) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const verified = await verifyFlutterwaveTransaction(txId, { signal: controller.signal });
      clearTimeout(timeout);

      if (verified.status !== "successful") {
        console.warn("[Flutterwave webhook] ✗ Secondary verify failed", { txId });
        if (eventId) await markWebhookFailed(supabase, eventId, "Secondary verification failed");
        return NextResponse.json({ received: true });
      }

      // FIX #3: Verify amount matches what we expect
      if (verified.amount == null || Number(verified.amount) <= 0) {
        console.warn("[Flutterwave webhook] ✗ Verified amount invalid", { verified });
        if (eventId) await markWebhookFailed(supabase, eventId, "Invalid verified amount");
        return NextResponse.json({ received: true });
      }

      // FIX #8: Verify currency matches
      if (verified.currency && currency && verified.currency !== currency) {
        console.warn("[Flutterwave webhook] ✗ Currency mismatch", {
          webhookCurrency: currency,
          verifiedCurrency: verified.currency,
        });
        if (eventId) await markWebhookFailed(supabase, eventId, "Currency mismatch");
        return NextResponse.json({ received: true });
      }

      console.info("[Flutterwave webhook] ✓ Secondary verify passed", { txId });
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        // Timeout — Flutterwave API slow; proceed cautiously but log clearly
        console.warn("[Flutterwave webhook] Verify timed out after 8s — proceeding without verify");
      } else {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[Flutterwave webhook] ✗ Verify API error — aborting", { msg, txId });
        if (eventId) await markWebhookFailed(supabase, eventId, `Verify API error: ${msg}`);
        return NextResponse.json({ received: true });
      }
    }
  } else {
    console.warn("[Flutterwave webhook] No numeric txId — skipping secondary verify", { txRef });
  }

  // 9. Resolve order
  const resolved = await resolveByTxRef(supabase, txRef);
  if (!resolved) {
    console.warn("[Flutterwave webhook] No transaction row for tx_ref", { txRef });
    if (eventId) await markWebhookFailed(supabase, eventId, "Transaction record not found");
    return NextResponse.json({ received: true });
  }

  const { orderId, transactionId } = resolved;

  // 10. Fetch full order
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, payment_status, buyer_id, vendor_id, total_amount, currency")
    .eq("id", orderId)
    .single();

  if (orderError || !order) {
    console.warn("[Flutterwave webhook] Order not found", { orderId });
    if (eventId) await markWebhookFailed(supabase, eventId, "Order not found");
    return NextResponse.json({ received: true });
  }

  // FIX #3: Amount check against order's expected total
  if (amount != null && Number(amount) < Number(order.total_amount)) {
    console.warn("[Flutterwave webhook] ✗ Amount mismatch — possible fraud attempt", {
      expected: order.total_amount,
      received: amount,
      orderId,
    });
    if (eventId) await markWebhookFailed(supabase, eventId, "Amount mismatch");
    return NextResponse.json({ received: true });
  }

  // 11. Link webhook_event ↔ order and transaction
  if (eventId) {
    await Promise.all([
      supabase.from("webhook_events").update({ order_id: orderId }).eq("id", eventId),
      supabase
        .from("transactions")
        .update({ webhook_event_id: eventId, updated_at: new Date().toISOString() })
        .eq("id", transactionId),
    ]);
  }

  if (isOrderFinalized(order.payment_status)) {
    console.info("[Flutterwave webhook] Order already finalized — skipping", {
      orderId,
      paymentStatus: order.payment_status,
    });
    if (eventId) await markWebhookProcessed(supabase, eventId, orderId);
    return NextResponse.json({ received: true, status: "already_processed" });
  }

  // 12. Finalise order + credit wallet
  try {
    await finalizeOrderPayment(supabase, orderId, {
      providerTransactionId: txId != null ? String(txId) : txRef,
      providerReference: txRef,
      paidAtIso: new Date().toISOString(),
      notifyUserId: order.buyer_id ?? null,
      paymentProvider: "flutterwave",
      webhookReference: idempotencyKey,
    });

    await Promise.all([
      supabase
        .from("transactions")
        .update({ status: "completed", updated_at: new Date().toISOString() })
        .eq("id", transactionId),

      supabase.rpc("merge_order_metadata", {
        p_order_id: orderId,
        p_metadata: {
          gateway_used: "flutterwave",
          payment_provider: "flutterwave",
          flutterwave_transaction_id: txId ?? null,
          flutterwave_tx_ref: txRef,
        },
      }),
    ]);

    console.log("[Flutterwave webhook] ✓ Order finalized", { orderId, transactionId });
    if (eventId) await markWebhookProcessed(supabase, eventId, orderId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[Flutterwave webhook] ✗ Finalize failed", { msg, orderId });
    if (eventId) await markWebhookFailed(supabase, eventId, msg);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}