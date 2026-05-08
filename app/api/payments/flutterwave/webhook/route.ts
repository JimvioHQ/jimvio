
// import { NextRequest, NextResponse } from "next/server";
// import { createClient, SupabaseClient } from "@supabase/supabase-js";
// import { validateFlutterwaveWebhook, verifyFlutterwaveTransaction } from "@/lib/flutterwave";
// import { finalizeOrderPayment } from "@/lib/payments/finalize-order-payment";
// import {
//   logWebhookEvent,
//   markWebhookProcessed,
//   markWebhookFailed,
// } from "@/lib/payments/webhook-logger";

// export const dynamic = "force-dynamic";

// // ─── Supabase (lazy) ──────────────────────────────────────────────────────────

// function getSupabase(): SupabaseClient {
//   const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
//   const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
//   if (!url || !key) throw new Error("Supabase env vars are not configured");
//   return createClient(url, key, {
//     auth: { autoRefreshToken: false, persistSession: false },
//   });
// }

// // ─── GET handler — reachability check ────────────────────────────────────────
// // Visit /api/payments/flutterwave/webhook in a browser to confirm
// // the route is deployed before debugging Flutterwave's delivery logs.

// export async function GET() {
//   return NextResponse.json({
//     ok: true,
//     message: "Flutterwave webhook endpoint is reachable",
//     ts: new Date().toISOString(),
//   });
// }

// // ─── Wallet credit helper ─────────────────────────────────────────────────────
// // Shared logic between webhook (async path) and status route (sync path).
// // Credits vendor's available_balance and total_earned after commission deduction.
// // Non-fatal — logs errors but never throws, so order finalization always completes.

// async function creditVendorWallet(
//   supabase: SupabaseClient,
//   params: {
//     vendorId: string;
//     totalAmount: number;
//     currency: string;
//     orderId: string;
//   }
// ): Promise<{ credited: boolean; netAmount?: number }> {
//   const { vendorId, totalAmount, currency, orderId } = params;

//   // Fetch vendor → get user_id + commission_rate
//   const { data: vendor, error: vendorError } = await supabase
//     .from("vendors")
//     .select("user_id, commission_rate")
//     .eq("id", vendorId)
//     .single();

//   if (vendorError || !vendor) {
//     console.error("[wallet/credit] Vendor not found", { vendorId, orderId });
//     return { credited: false };
//   }

//   // Net amount = total minus platform commission (stored as percentage, e.g. 8 = 8%)
//   const commissionRate = Number(vendor.commission_rate ?? 0);
//   const netAmount = totalAmount * (1 - commissionRate / 100);

//   // Fetch vendor's wallet
//   const { data: wallet, error: walletError } = await supabase
//     .from("wallets")
//     .select("id, available_balance, total_earned")
//     .eq("user_id", vendor.user_id)
//     .single();

//   if (walletError || !wallet) {
//     console.error("[wallet/credit] Vendor wallet not found", {
//       vendorUserId: vendor.user_id,
//       orderId,
//     });
//     return { credited: false };
//   }

//   // Increment balances
//   const { error: updateError } = await supabase
//     .from("wallets")
//     .update({
//       available_balance: Number(wallet.available_balance ?? 0) + netAmount,
//       total_earned: Number(wallet.total_earned ?? 0) + netAmount,
//       updated_at: new Date().toISOString(),
//     })
//     .eq("id", wallet.id);

//   if (updateError) {
//     console.error("[wallet/credit] Wallet update failed", {
//       reason: updateError.message,
//       vendorUserId: vendor.user_id,
//       orderId,
//     });
//     return { credited: false };
//   }

//   console.info("[wallet/credit] ✓ Vendor wallet credited via webhook", {
//     vendorId,
//     netAmount,
//     currency,
//     orderId,
//   });

//   return { credited: true, netAmount };
// }

// // ─── Resolve order + transaction via transactions table ───────────────────────
// // FIX: uses .maybeSingle() instead of .single() so missing rows return null
// // cleanly without generating PGRST116 errors in your logs.

// async function resolveByTxRef(
//   supabase: SupabaseClient,
//   txRef: string
// ): Promise<{ orderId: string; transactionId: string } | null> {
//   const { data, error } = await supabase
//     .from("transactions")
//     .select("id, order_id")
//     .eq("provider", "flutterwave")
//     .eq("provider_transaction_id", txRef)
//     .maybeSingle(); // ✅ was .single() — threw PGRST116 when no row found

//   if (error) {
//     console.error("[Flutterwave webhook] resolveByTxRef error", {
//       reason: error.message,
//       txRef,
//     });
//   }

//   if (!data?.order_id) return null;
//   return { orderId: data.order_id as string, transactionId: data.id as string };
// }

// // ─── POST handler ─────────────────────────────────────────────────────────────

// export async function POST(req: NextRequest) {
//   // 1. Read raw body FIRST — must happen before any other parsing.
//   //    Calling req.text() or req.json() a second time returns empty string
//   //    because the body stream is already consumed.
//   const rawBody = await req.text();
//   const signature = req.headers.get("verif-hash");

//   // 2. Diagnostic log — confirms Flutterwave is actually reaching this route.
//   //    If you never see this in your logs, the problem is network/URL not code.
//   console.info("[Flutterwave webhook] Incoming request", {
//     hasBody: rawBody.length > 0,
//     bodyLength: rawBody.length,
//     hasSignature: !!signature,
//     secretPresent: !!process.env.FLUTTERWAVE_WEBHOOK_SECRET,
//     contentType: req.headers.get("content-type"),
//   });

//   // 3. Signature validation
//   //    If this fails, check:
//   //      - FLUTTERWAVE_WEBHOOK_SECRET matches "Secret Hash" in FLW dashboard exactly
//   //      - No trailing whitespace/newline in env var
//   //      - Test keys used with test webhooks (not mixed with live)
//   if (!validateFlutterwaveWebhook(rawBody, signature)) {
//     console.warn("[Flutterwave webhook] ✗ Signature validation failed", {
//       secretPresent: !!process.env.FLUTTERWAVE_WEBHOOK_SECRET,
//     });
//     return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//   }

//   console.info("[Flutterwave webhook] ✓ Signature valid");

//   // 4. Parse payload
//   let event: { event?: string; data?: { id?: number; tx_ref?: string; status?: string } };
//   try {
//     event = JSON.parse(rawBody);
//   } catch {
//     console.error("[Flutterwave webhook] Invalid JSON body");
//     return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
//   }

//   const txData = event.data;

//   console.info("[Flutterwave webhook] Event parsed", {
//     event: event.event,
//     txRef: txData?.tx_ref,
//     txId: txData?.id,
//     txStatus: txData?.status,
//   });

//   // Nothing actionable — acknowledge and exit
//   if (!txData?.tx_ref) {
//     return NextResponse.json({ received: true });
//   }

//   const supabase = getSupabase();

//   // 5. Handle explicit failure events
//   if (txData.status === "failed") {
//     const resolved = await resolveByTxRef(supabase, txData.tx_ref);

//     if (resolved) {
//       const { orderId, transactionId } = resolved;
//       const now = new Date().toISOString();

//       const { data: existingOrder } = await supabase
//         .from("orders")
//         .select("id, payment_status")
//         .eq("id", orderId)
//         .single();

//       // Never downgrade a completed/paid order
//       if (
//         existingOrder &&
//         existingOrder.payment_status !== "completed" &&
//         existingOrder.payment_status !== "paid"
//       ) {
//         await supabase
//           .from("orders")
//           .update({ payment_status: "failed", status: "cancelled", updated_at: now })
//           .eq("id", orderId);
//       }

//       await supabase
//         .from("transactions")
//         .update({ status: "failed", updated_at: new Date().toISOString() })
//         .eq("id", transactionId);
//     }

//     return NextResponse.json({ received: true });
//   }

//   // 6. Ignore non-successful events (e.g. "pending", "cancelled" from Flutterwave)
//   if (txData.status !== "successful") {
//     return NextResponse.json({ received: true });
//   }

//   const txId = String(txData.id ?? txData.tx_ref);

//   // 7. Idempotency guard — prevents double-processing on Flutterwave retries
//   const idempotencyKey = `flw-${txId}`;
//   const { isDuplicate, eventId } = await logWebhookEvent(supabase, {
//     provider: "flutterwave",
//     idempotencyKey,
//     payload: event,
//     orderId: null,
//   });

//   if (isDuplicate) {
//     return NextResponse.json({ received: true, duplicate: true });
//   }

//   // 8. Secondary Flutterwave verification — confirm before touching money
//   if (txData.id) {
//     try {
//       const verified = await verifyFlutterwaveTransaction(txData.id);
//       if (verified.status !== "successful") {
//         console.warn("[Flutterwave webhook] Secondary verify failed", { txId });
//         if (eventId) await markWebhookFailed(supabase, eventId, "Secondary verification failed");
//         return NextResponse.json({ received: true });
//       }
//     } catch (e) {
//       // Network error — non-fatal, proceed. finalizeOrderPayment is idempotent.
//       console.error("[Flutterwave webhook] Verify API error — proceeding", e);
//     }
//   }

//   // 9. Resolve order + transaction via transactions table (Option B)
//   const resolved = await resolveByTxRef(supabase, txData.tx_ref);

//   if (!resolved) {
//     console.warn("[Flutterwave webhook] No transaction row found for tx_ref", txData.tx_ref);
//     if (eventId) await markWebhookFailed(supabase, eventId, "Transaction record not found");
//     return NextResponse.json({ received: true });
//   }

//   const { orderId, transactionId } = resolved;

//   // 10. Fetch order — include vendor_id + amounts for wallet credit
//   const { data: order } = await supabase
//     .from("orders")
//     .select("id, payment_status, buyer_id, vendor_id, total_amount, currency")
//     .eq("id", orderId)
//     .single();

//   if (!order) {
//     console.warn("[Flutterwave webhook] Order not found", { orderId });
//     if (eventId) await markWebhookFailed(supabase, eventId, "Order not found");
//     return NextResponse.json({ received: true });
//   }

//   // 11. Link webhook_event ↔ order and webhook_event ↔ transaction
//   if (eventId) {
//     await Promise.all([
//       supabase
//         .from("webhook_events")
//         .update({ order_id: orderId })
//         .eq("id", eventId),
//       supabase
//         .from("transactions")
//         .update({ webhook_event_id: eventId, updated_at: new Date().toISOString() })
//         .eq("id", transactionId),
//     ]);
//   }

//   // 12. Idempotent short-circuit — catches both "paid" (set by status route)
//   //     and "completed" (set by finalizeOrderPayment).
//   //     FIX: previous version only checked "completed", so if status/route.ts
//   //     ran first and set payment_status = "paid", the webhook would call
//   //     finalizeOrderPayment a second time.
//   if (order.payment_status === "completed" || order.payment_status === "paid") {
//     console.info("[Flutterwave webhook] Order already finalized, skipping", {
//       orderId,
//       paymentStatus: order.payment_status,
//     });
//     if (eventId) await markWebhookProcessed(supabase, eventId, orderId);
//     return NextResponse.json({ received: true, status: "already_processed" });
//   }

//   // 13. Finalize order + credit vendor wallet
//   try {
//     await finalizeOrderPayment(supabase, orderId, {
//       providerTransactionId: txId,
//       providerReference: txData.tx_ref,
//       paidAtIso: new Date().toISOString(),
//       notifyUserId: order.buyer_id ?? null,
//       paymentProvider: "flutterwave",
//       webhookReference: idempotencyKey,
//     });

//     // Mark transaction completed
//     await supabase
//       .from("transactions")
//       .update({ status: "completed", updated_at: new Date().toISOString() })
//       .eq("id", transactionId);

//     // FIX: credit vendor wallet — was missing from webhook path.
//     // Without this, vendors only got credited if the buyer visited the
//     // success page (status route) before the webhook fired.
//     if (order.vendor_id) {
//       await creditVendorWallet(supabase, {
//         vendorId: order.vendor_id,
//         totalAmount: Number(order.total_amount),
//         currency: order.currency ?? "RWF",
//         orderId,
//       });
//     } else {
//       console.warn("[Flutterwave webhook] No vendor on order — wallet credit skipped", {
//         orderId,
//       });
//     }

//     console.log("[Flutterwave webhook] ✓ Order finalized + wallet credited:", orderId);
//     if (eventId) await markWebhookProcessed(supabase, eventId, orderId);
//   } catch (e) {
//     const msg = e instanceof Error ? e.message : String(e);
//     console.error("[Flutterwave webhook] ✗ Finalize failed:", msg);
//     if (eventId) await markWebhookFailed(supabase, eventId, msg);
//   }

//   return NextResponse.json({ received: true });
// }

// app/api/payments/flutterwave/webhook/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
  validateFlutterwaveWebhook,
  verifyFlutterwaveTransaction,
} from "@/lib/flutterwave";
import { finalizeOrderPayment } from "@/lib/payments/finalize-order-payment";
import {
  markWebhookProcessed,
  markWebhookFailed,
} from "@/lib/payments/webhook-logger";

export const dynamic = "force-dynamic";

// ─── Supabase ────────────────────────────────────────────────────────────────

function getSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env vars are not configured");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ─── GET — protected reachability check ──────────────────────────────────────
// Add x-admin-key header to test: curl -H "x-admin-key: YOUR_KEY" https://yoursite.com/api/payments/flutterwave/webhook

export async function GET(req: NextRequest) {
  const adminKey = req.headers.get("x-admin-key");
  if (adminKey !== process.env.ADMIN_SECRET_KEY) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json({
    ok: true,
    message: "Flutterwave webhook endpoint is reachable",
    ts: new Date().toISOString(),
  });
}

// ─── Resolve order via transactions table ─────────────────────────────────────
// Flow: txRef → transactions.provider_transaction_id → transactions.order_id → orders
// No extra columns needed on orders table — already wired via transactions

async function resolveByTxRef(
  supabase: SupabaseClient,
  txRef: string
): Promise<{ orderId: string; transactionId: string } | null> {
  const { data, error } = await supabase
    .from("transactions")
    .select("id, order_id")
    .eq("provider", "flutterwave")
    .eq("provider_transaction_id", txRef)
    .maybeSingle();

  if (error) {
    console.error("[webhook] resolveByTxRef error", {
      reason: error.message,
      txRef,
    });
    return null;
  }

  if (!data?.order_id) {
    console.warn("[webhook] No transaction found for tx_ref", { txRef });
    return null;
  }

  return { orderId: data.order_id, transactionId: data.id };
}

// ─── Atomic wallet credit ─────────────────────────────────────────────────────
// Uses RPC for atomic increment — prevents race condition when
// two webhooks fire simultaneously and both read the same balance.
//
// Required SQL (run once in Supabase SQL editor):
//
// create or replace function increment_wallet_balance(
//   p_wallet_id uuid,
//   p_amount    numeric
// )
// returns void language sql as $$
//   update wallets
//   set
//     available_balance = available_balance + p_amount,
//     total_earned      = total_earned + p_amount,
//     updated_at        = now()
//   where id = p_wallet_id;
// $$;

async function creditVendorWallet(
  supabase: SupabaseClient,
  params: {
    vendorId: string;
    totalAmount: number;
    currency: string;
    orderId: string;
  }
): Promise<{ credited: boolean; netAmount?: number }> {
  const { vendorId, totalAmount, currency, orderId } = params;

  // 1. Get vendor user_id + commission rate
  const { data: vendor, error: vendorError } = await supabase
    .from("vendors")
    .select("user_id, commission_rate")
    .eq("id", vendorId)
    .single();

  if (vendorError || !vendor) {
    console.error("[wallet/credit] Vendor not found", { vendorId, orderId });
    return { credited: false };
  }

  // 2. Calculate net after platform commission
  const commissionRate = Number(vendor.commission_rate ?? 0);
  const netAmount      = totalAmount * (1 - commissionRate / 100);

  // 3. Get vendor's wallet id
  const { data: wallet, error: walletError } = await supabase
    .from("wallets")
    .select("id")
    .eq("user_id", vendor.user_id)
    .single();

  if (walletError || !wallet) {
    console.error("[wallet/credit] Wallet not found", {
      vendorUserId: vendor.user_id,
      orderId,
    });
    return { credited: false };
  }

  // 4. Atomic increment — no race condition
  const { error: rpcError } = await supabase.rpc("increment_wallet_balance", {
    p_wallet_id: wallet.id,
    p_amount:    netAmount,
  });

  if (rpcError) {
    console.error("[wallet/credit] RPC failed", {
      reason: rpcError.message,
      orderId,
    });
    return { credited: false };
  }

  console.info("[wallet/credit] ✓ Vendor wallet credited", {
    vendorId,
    netAmount,
    currency,
    orderId,
  });

  return { credited: true, netAmount };
}

// ─── Atomic idempotency via RPC ───────────────────────────────────────────────
// Prevents race condition where two concurrent webhooks both pass the
// duplicate check before either one inserts the event row.
//
// Required SQL (run once in Supabase SQL editor):
//
// create or replace function log_webhook_idempotent(
//   p_provider        text,
//   p_idempotency_key text,
//   p_payload         jsonb,
//   p_order_id        uuid default null
// )
// returns table(event_id uuid, is_duplicate boolean)
// language plpgsql as $$
// declare
//   v_id  uuid;
//   v_new boolean;
// begin
//   insert into webhook_events (provider, idempotency_key, payload, order_id, status)
//   values (p_provider, p_idempotency_key, p_payload, p_order_id, 'received')
//   on conflict (idempotency_key) do nothing
//   returning id into v_id;
//
//   v_new := v_id is not null;
//
//   if not v_new then
//     select id into v_id
//     from webhook_events
//     where idempotency_key = p_idempotency_key;
//   end if;
//
//   return query select v_id, not v_new;
// end;
// $$;

async function logWebhookIdempotent(
  supabase: SupabaseClient,
  params: {
    provider:        string;
    idempotencyKey:  string;
    payload:         unknown;
    orderId:         string | null;
  }
): Promise<{ eventId: string | null; isDuplicate: boolean }> {
  const { data, error } = await supabase.rpc("log_webhook_idempotent", {
    p_provider:        params.provider,
    p_idempotency_key: params.idempotencyKey,
    p_payload:         params.payload,
    p_order_id:        params.orderId,
  });

  if (error) {
    console.error("[webhook] logWebhookIdempotent RPC error", {
      reason: error.message,
    });
    return { eventId: null, isDuplicate: false };
  }

  return {
    eventId:     data?.[0]?.event_id     ?? null,
    isDuplicate: data?.[0]?.is_duplicate ?? false,
  };
}

// ─── POST handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // 1. Read raw body FIRST — stream is consumed after first read
  const rawBody   = await req.text();
  const signature = req.headers.get("verif-hash");

  // 2. Diagnostic log — if you never see this, the problem is network not code
  console.info("[Flutterwave webhook] Incoming request", {
    bodyLength:    rawBody.length,
    hasBody:       rawBody.length > 0,
    hasSignature:  !!signature,
    secretPresent: !!process.env.FLUTTERWAVE_WEBHOOK_SECRET,
    contentType:   req.headers.get("content-type"),
  });

  // 3. Signature validation
  //    IMPORTANT: Flutterwave uses plain string compare — NOT HMAC like Stripe.
  //    verif-hash header must equal FLUTTERWAVE_WEBHOOK_SECRET exactly.
  //    Make sure validateFlutterwaveWebhook does: signature === secret
  if (!validateFlutterwaveWebhook(rawBody, signature)) {
    console.warn("[Flutterwave webhook] ✗ Signature validation failed", {
      secretPresent: !!process.env.FLUTTERWAVE_WEBHOOK_SECRET,
      signatureReceived: signature,
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.info("[Flutterwave webhook] ✓ Signature valid");

  // 4. Parse payload
  let event: {
    event?: string;
    data?:  { id?: number; tx_ref?: string; status?: string };
  };

  try {
    event = JSON.parse(rawBody);
  } catch {
    console.error("[Flutterwave webhook] Invalid JSON body");
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const txData = event.data;

  console.info("[Flutterwave webhook] Event parsed", {
    event:    event.event,
    txRef:    txData?.tx_ref,
    txId:     txData?.id,
    txStatus: txData?.status,
  });

  // Nothing actionable
  if (!txData?.tx_ref) {
    return NextResponse.json({ received: true });
  }

  const supabase = getSupabase();

  // 5. Handle explicit failure events
  if (txData.status === "failed") {
    const resolved = await resolveByTxRef(supabase, txData.tx_ref);

    if (resolved) {
      const { orderId, transactionId } = resolved;

      const { data: existingOrder } = await supabase
        .from("orders")
        .select("id, payment_status, buyer_id")
        .eq("id", orderId)
        .single();

      // Never downgrade a completed/paid order
      if (
        existingOrder &&
        existingOrder.payment_status !== "completed" &&
        existingOrder.payment_status !== "paid"
      ) {
        await Promise.all([
          supabase
            .from("orders")
            .update({
              payment_status: "failed",
              status:         "cancelled",
              updated_at:     new Date().toISOString(),
            })
            .eq("id", orderId),

          supabase
            .from("transactions")
            .update({
              status:     "failed",
              updated_at: new Date().toISOString(),
            })
            .eq("id", transactionId),

          // Notify buyer
          existingOrder.buyer_id
            ? supabase.from("notifications").insert({
                user_id:    existingOrder.buyer_id,
                type:       "payment",
                title:      "Payment Failed",
                message:    "Your payment could not be processed. Please try again.",
                action_url: `/checkout?order=${orderId}`,
              })
            : Promise.resolve(),
        ]);
      }
    }

    return NextResponse.json({ received: true });
  }

  // 6. Ignore non-successful events
  if (txData.status !== "successful") {
    return NextResponse.json({ received: true });
  }

  const txId           = String(txData.id ?? txData.tx_ref);
  const idempotencyKey = `flw-${txId}`;

  // 7. Atomic idempotency — prevents double processing on retries
  const { eventId, isDuplicate } = await logWebhookIdempotent(supabase, {
    provider:       "flutterwave",
    idempotencyKey,
    payload:        event,
    orderId:        null,
  });

  if (isDuplicate) {
    console.info("[Flutterwave webhook] Duplicate — already processed", {
      idempotencyKey,
    });
    return NextResponse.json({ received: true, duplicate: true });
  }

  // 8. Secondary verification with 4s timeout
  //    Flutterwave expects response within 5s — timeout prevents hanging
  if (txData.id) {
    try {
      const controller = new AbortController();
      const timeout    = setTimeout(() => controller.abort(), 4000);

      const verified = await verifyFlutterwaveTransaction(txData.id, {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (verified.status !== "successful") {
        console.warn("[Flutterwave webhook] ✗ Secondary verify failed", { txId });
        if (eventId) await markWebhookFailed(supabase, eventId, "Secondary verification failed");
        return NextResponse.json({ received: true });
      }

      console.info("[Flutterwave webhook] ✓ Secondary verify passed", { txId });
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        // Timed out — proceed rather than block. Idempotency key protects doubles.
        console.warn("[Flutterwave webhook] Verify timed out after 4s — proceeding");
      } else {
        // Network error — non-fatal, proceed
        console.error("[Flutterwave webhook] Verify API error — proceeding", e);
      }
    }
  }

  // 9. Resolve order via transactions table
  //    Chain: txRef → transactions.provider_transaction_id → order_id → orders
  const resolved = await resolveByTxRef(supabase, txData.tx_ref);

  if (!resolved) {
    console.warn("[Flutterwave webhook] No transaction row for tx_ref", {
      txRef: txData.tx_ref,
    });
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

  // 11. Link webhook_event ↔ order and webhook_event ↔ transaction
  if (eventId) {
    await Promise.all([
      supabase
        .from("webhook_events")
        .update({ order_id: orderId })
        .eq("id", eventId),

      supabase
        .from("transactions")
        .update({
          webhook_event_id: eventId,
          updated_at:       new Date().toISOString(),
        })
        .eq("id", transactionId),
    ]);
  }

  // 12. Short-circuit — catches both "paid" (set by status/callback route)
  //     and "completed" (set by finalizeOrderPayment)
  if (
    order.payment_status === "completed" ||
    order.payment_status === "paid"
  ) {
    console.info("[Flutterwave webhook] Order already finalized — skipping", {
      orderId,
      paymentStatus: order.payment_status,
    });
    if (eventId) await markWebhookProcessed(supabase, eventId, orderId);
    return NextResponse.json({ received: true, status: "already_processed" });
  }

  // 13. Finalize order + credit vendor wallet
  try {
    // Finalize order — sets status, grants digital access, notifies buyer
    await finalizeOrderPayment(supabase, orderId, {
      providerTransactionId: txId,
      providerReference:     txData.tx_ref,
      paidAtIso:             new Date().toISOString(),
      notifyUserId:          order.buyer_id ?? null,
      paymentProvider:       "flutterwave",
      webhookReference:      idempotencyKey,
    });

    // Mark transaction completed
    await supabase
      .from("transactions")
      .update({
        status:     "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", transactionId);

    // Store gateway info in metadata — no extra columns needed
    const { data: currentOrder } = await supabase
      .from("orders")
      .select("metadata")
      .eq("id", orderId)
      .single();

    await supabase
      .from("orders")
      .update({
        metadata: {
          ...(currentOrder?.metadata ?? {}),
          gateway_used:               "flutterwave",
          payment_provider:           "flutterwave",
          flutterwave_transaction_id: txData.id ?? null,
          flutterwave_tx_ref:         txData.tx_ref,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    // Credit vendor wallet — atomic via RPC
    if (order.vendor_id) {
      await creditVendorWallet(supabase, {
        vendorId:    order.vendor_id,
        totalAmount: Number(order.total_amount),
        currency:    order.currency ?? "RWF",
        orderId,
      });
    } else {
      console.warn("[Flutterwave webhook] No vendor on order — wallet skip", {
        orderId,
      });
    }

    console.log("[Flutterwave webhook] ✓ Order finalized + wallet credited", {
      orderId,
      transactionId,
    });

    if (eventId) await markWebhookProcessed(supabase, eventId, orderId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[Flutterwave webhook] ✗ Finalize failed", { msg, orderId });
    if (eventId) await markWebhookFailed(supabase, eventId, msg);
  }

  return NextResponse.json({ received: true });
}