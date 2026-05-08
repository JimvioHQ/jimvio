
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

// // ─── Supabase client (lazy — matches initiate pattern) ────────────────────────

// function getSupabase(): SupabaseClient {
//   const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
//   const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
//   if (!url || !key) throw new Error("Supabase env vars are not configured");
//   return createClient(url, key, {
//     auth: { autoRefreshToken: false, persistSession: false },
//   });
// }

// // ─── Resolve order + transaction via the transactions table ───────────────────
// //
// // initiate/route.ts inserts a transactions row with:
// //   provider                = "flutterwave"
// //   provider_transaction_id = txRef
// //
// // We look that row up here to get both the transaction id and the order id,
// // so we never need flutterwave_tx_ref on the orders table.

// async function resolveByTxRef(
//   supabase: SupabaseClient,
//   txRef: string
// ): Promise<{ orderId: string; transactionId: string } | null> {
//   const { data, error } = await supabase
//     .from("transactions")
//     .select("id, order_id")
//     .eq("provider", "flutterwave")
//     .eq("provider_transaction_id", txRef)
//     .single();

//   if (error || !data?.order_id) return null;
//   return { orderId: data.order_id as string, transactionId: data.id as string };
// }

// // ─── Route handler ────────────────────────────────────────────────────────────

// export async function POST(req: NextRequest) {
//   const rawBody = await req.text();
//   const signature = req.headers.get("verif-hash");

//   // 1. Validate Flutterwave webhook signature
//   if (!validateFlutterwaveWebhook(rawBody, signature)) {
//     console.warn("[Flutterwave webhook] Invalid signature");
//     return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//   }

//   // 2. Parse payload
//   let event: { event?: string; data?: { id?: number; tx_ref?: string; status?: string } };
//   try {
//     event = JSON.parse(rawBody);
//   } catch {
//     return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
//   }

//   const txData = event.data;

//   // Nothing actionable in the payload — acknowledge and exit
//   if (!txData?.tx_ref) {
//     return NextResponse.json({ received: true });
//   }

//   const supabase = getSupabase();

//   // 3. Handle explicit failure events
//   //    Mark the order cancelled and the transaction failed.
//   //    Never downgrade an order that already completed.
//   if (txData.status === "failed") {
//     const resolved = await resolveByTxRef(supabase, txData.tx_ref);

//     if (resolved) {
//       const { orderId, transactionId } = resolved;

//       const { data: existingOrder } = await supabase
//         .from("orders")
//         .select("id, payment_status")
//         .eq("id", orderId)
//         .single();

//       if (existingOrder && existingOrder.payment_status !== "completed") {
//         await supabase
//           .from("orders")
//           .update({
//             payment_status: "failed",
//             status: "cancelled",
//             updated_at: new Date().toISOString(),
//           })
//           .eq("id", orderId);
//       }

//       // Always sync the transaction row, even if order was already completed
//       await supabase
//         .from("transactions")
//         .update({
//           status: "failed",
//           updated_at: new Date().toISOString(),
//         })
//         .eq("id", transactionId);
//     }

//     return NextResponse.json({ received: true });
//   }

//   // 4. Ignore non-successful events (e.g. "pending", "cancelled" from Flutterwave)
//   if (txData.status !== "successful") {
//     return NextResponse.json({ received: true });
//   }

//   const txId = String(txData.id ?? txData.tx_ref);

//   // 5. Idempotency guard — prevents double-processing on Flutterwave retries.
//   //    logWebhookEvent inserts into webhook_events with a unique idempotency_key.
//   //    If the key already exists it returns isDuplicate = true.
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

//   // 6. Secondary verification — confirm with Flutterwave API before touching money.
//   //    Network errors are non-fatal; finalizeOrderPayment is idempotent.
//   if (txData.id) {
//     try {
//       const verified = await verifyFlutterwaveTransaction(txData.id);
//       if (verified.status !== "successful") {
//         console.warn("[Flutterwave webhook] Secondary verify failed for tx", txId);
//         if (eventId) await markWebhookFailed(supabase, eventId, "Secondary verification failed");
//         return NextResponse.json({ received: true });
//       }
//     } catch (e) {
//       console.error("[Flutterwave webhook] verify API error — proceeding anyway", e);
//     }
//   }

//   // 7. Resolve order + transaction via the transactions table (Option B)
//   const resolved = await resolveByTxRef(supabase, txData.tx_ref);

//   if (!resolved) {
//     console.warn("[Flutterwave webhook] No transaction row found for tx_ref", txData.tx_ref);
//     if (eventId) await markWebhookFailed(supabase, eventId, "Transaction record not found");
//     return NextResponse.json({ received: true });
//   }

//   const { orderId, transactionId } = resolved;

//   // 8. Fetch current order state
//   const { data: order } = await supabase
//     .from("orders")
//     .select("id, payment_status, buyer_id")
//     .eq("id", orderId)
//     .single();

//   if (!order) {
//     console.warn("[Flutterwave webhook] Order not found for id", orderId);
//     if (eventId) await markWebhookFailed(supabase, eventId, "Order not found");
//     return NextResponse.json({ received: true });
//   }

//   // 9. Attach the resolved order id to the webhook_events row for traceability,
//   //    and close the transactions <-> webhook_events relation by writing
//   //    webhook_event_id back onto the transaction row.
//   if (eventId) {
//     await Promise.all([
//       supabase
//         .from("webhook_events")
//         .update({ order_id: orderId })
//         .eq("id", eventId),

//       supabase
//         .from("transactions")
//         .update({
//           webhook_event_id: eventId,
//           updated_at: new Date().toISOString(),
//         })
//         .eq("id", transactionId),
//     ]);
//   }

//   // 10. Idempotent short-circuit — order was already completed by a prior webhook
//   if (order.payment_status === "completed") {
//     if (eventId) await markWebhookProcessed(supabase, eventId, orderId);
//     return NextResponse.json({ received: true, status: "already_processed" });
//   }

//   // 11. Finalize the order — updates order status, wallet credits, commission records, etc.
//   try {
//     await finalizeOrderPayment(supabase, orderId, {
//       providerTransactionId: txId,
//       providerReference: txData.tx_ref,
//       paidAtIso: new Date().toISOString(),
//       notifyUserId: order.buyer_id ?? null,
//       paymentProvider: "flutterwave",
//       webhookReference: idempotencyKey,
//     });

//     // 12. Mark the pending transaction row as completed
//     await supabase
//       .from("transactions")
//       .update({
//         status: "completed",
//         updated_at: new Date().toISOString(),
//       })
//       .eq("id", transactionId);

//     console.log("[Flutterwave webhook] ✓ Order finalized:", orderId);
//     if (eventId) await markWebhookProcessed(supabase, eventId, orderId);
//   } catch (e) {
//     const msg = e instanceof Error ? e.message : String(e);
//     console.error("[Flutterwave webhook] ✗ finalize failed:", msg);
//     if (eventId) await markWebhookFailed(supabase, eventId, msg);
//   }

//   return NextResponse.json({ received: true });
// }
// app/api/payments/flutterwave/webhook/route.ts
//
// Fixes applied vs previous version:
//   1. resolveByTxRef uses .maybeSingle() not .single() — no false PGRST116 errors
//   2. Idempotency short-circuit catches both "completed" AND "paid" statuses
//   3. creditVendorWallet called after finalizeOrderPayment — vendor always gets credited
//   4. GET handler for reachability checks
//   5. Diagnostic logging before signature validation

import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { validateFlutterwaveWebhook, verifyFlutterwaveTransaction } from "@/lib/flutterwave";
import { finalizeOrderPayment } from "@/lib/payments/finalize-order-payment";
import {
  logWebhookEvent,
  markWebhookProcessed,
  markWebhookFailed,
} from "@/lib/payments/webhook-logger";

export const dynamic = "force-dynamic";

// ─── Supabase (lazy) ──────────────────────────────────────────────────────────

function getSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env vars are not configured");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ─── GET handler — reachability check ────────────────────────────────────────
// Visit /api/payments/flutterwave/webhook in a browser to confirm
// the route is deployed before debugging Flutterwave's delivery logs.

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Flutterwave webhook endpoint is reachable",
    ts: new Date().toISOString(),
  });
}

// ─── Wallet credit helper ─────────────────────────────────────────────────────
// Shared logic between webhook (async path) and status route (sync path).
// Credits vendor's available_balance and total_earned after commission deduction.
// Non-fatal — logs errors but never throws, so order finalization always completes.

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

  // Fetch vendor → get user_id + commission_rate
  const { data: vendor, error: vendorError } = await supabase
    .from("vendors")
    .select("user_id, commission_rate")
    .eq("id", vendorId)
    .single();

  if (vendorError || !vendor) {
    console.error("[wallet/credit] Vendor not found", { vendorId, orderId });
    return { credited: false };
  }

  // Net amount = total minus platform commission (stored as percentage, e.g. 8 = 8%)
  const commissionRate = Number(vendor.commission_rate ?? 0);
  const netAmount = totalAmount * (1 - commissionRate / 100);

  // Fetch vendor's wallet
  const { data: wallet, error: walletError } = await supabase
    .from("wallets")
    .select("id, available_balance, total_earned")
    .eq("user_id", vendor.user_id)
    .single();

  if (walletError || !wallet) {
    console.error("[wallet/credit] Vendor wallet not found", {
      vendorUserId: vendor.user_id,
      orderId,
    });
    return { credited: false };
  }

  // Increment balances
  const { error: updateError } = await supabase
    .from("wallets")
    .update({
      available_balance: Number(wallet.available_balance ?? 0) + netAmount,
      total_earned: Number(wallet.total_earned ?? 0) + netAmount,
      updated_at: new Date().toISOString(),
    })
    .eq("id", wallet.id);

  if (updateError) {
    console.error("[wallet/credit] Wallet update failed", {
      reason: updateError.message,
      vendorUserId: vendor.user_id,
      orderId,
    });
    return { credited: false };
  }

  console.info("[wallet/credit] ✓ Vendor wallet credited via webhook", {
    vendorId,
    netAmount,
    currency,
    orderId,
  });

  return { credited: true, netAmount };
}

// ─── Resolve order + transaction via transactions table ───────────────────────
// FIX: uses .maybeSingle() instead of .single() so missing rows return null
// cleanly without generating PGRST116 errors in your logs.

async function resolveByTxRef(
  supabase: SupabaseClient,
  txRef: string
): Promise<{ orderId: string; transactionId: string } | null> {
  const { data, error } = await supabase
    .from("transactions")
    .select("id, order_id")
    .eq("provider", "flutterwave")
    .eq("provider_transaction_id", txRef)
    .maybeSingle(); // ✅ was .single() — threw PGRST116 when no row found

  if (error) {
    console.error("[Flutterwave webhook] resolveByTxRef error", {
      reason: error.message,
      txRef,
    });
  }

  if (!data?.order_id) return null;
  return { orderId: data.order_id as string, transactionId: data.id as string };
}

// ─── POST handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // 1. Read raw body FIRST — must happen before any other parsing.
  //    Calling req.text() or req.json() a second time returns empty string
  //    because the body stream is already consumed.
  const rawBody = await req.text();
  const signature = req.headers.get("verif-hash");

  // 2. Diagnostic log — confirms Flutterwave is actually reaching this route.
  //    If you never see this in your logs, the problem is network/URL not code.
  console.info("[Flutterwave webhook] Incoming request", {
    hasBody: rawBody.length > 0,
    bodyLength: rawBody.length,
    hasSignature: !!signature,
    secretPresent: !!process.env.FLUTTERWAVE_WEBHOOK_SECRET,
    contentType: req.headers.get("content-type"),
  });

  // 3. Signature validation
  //    If this fails, check:
  //      - FLUTTERWAVE_WEBHOOK_SECRET matches "Secret Hash" in FLW dashboard exactly
  //      - No trailing whitespace/newline in env var
  //      - Test keys used with test webhooks (not mixed with live)
  if (!validateFlutterwaveWebhook(rawBody, signature)) {
    console.warn("[Flutterwave webhook] ✗ Signature validation failed", {
      secretPresent: !!process.env.FLUTTERWAVE_WEBHOOK_SECRET,
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.info("[Flutterwave webhook] ✓ Signature valid");

  // 4. Parse payload
  let event: { event?: string; data?: { id?: number; tx_ref?: string; status?: string } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    console.error("[Flutterwave webhook] Invalid JSON body");
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const txData = event.data;

  console.info("[Flutterwave webhook] Event parsed", {
    event: event.event,
    txRef: txData?.tx_ref,
    txId: txData?.id,
    txStatus: txData?.status,
  });

  // Nothing actionable — acknowledge and exit
  if (!txData?.tx_ref) {
    return NextResponse.json({ received: true });
  }

  const supabase = getSupabase();

  // 5. Handle explicit failure events
  if (txData.status === "failed") {
    const resolved = await resolveByTxRef(supabase, txData.tx_ref);

    if (resolved) {
      const { orderId, transactionId } = resolved;
      const now = new Date().toISOString();

      const { data: existingOrder } = await supabase
        .from("orders")
        .select("id, payment_status")
        .eq("id", orderId)
        .single();

      // Never downgrade a completed/paid order
      if (
        existingOrder &&
        existingOrder.payment_status !== "completed" &&
        existingOrder.payment_status !== "paid"
      ) {
        await supabase
          .from("orders")
          .update({ payment_status: "failed", status: "cancelled", updated_at: now })
          .eq("id", orderId);
      }

      await supabase
        .from("transactions")
        .update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("id", transactionId);
    }

    return NextResponse.json({ received: true });
  }

  // 6. Ignore non-successful events (e.g. "pending", "cancelled" from Flutterwave)
  if (txData.status !== "successful") {
    return NextResponse.json({ received: true });
  }

  const txId = String(txData.id ?? txData.tx_ref);

  // 7. Idempotency guard — prevents double-processing on Flutterwave retries
  const idempotencyKey = `flw-${txId}`;
  const { isDuplicate, eventId } = await logWebhookEvent(supabase, {
    provider: "flutterwave",
    idempotencyKey,
    payload: event,
    orderId: null,
  });

  if (isDuplicate) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  // 8. Secondary Flutterwave verification — confirm before touching money
  if (txData.id) {
    try {
      const verified = await verifyFlutterwaveTransaction(txData.id);
      if (verified.status !== "successful") {
        console.warn("[Flutterwave webhook] Secondary verify failed", { txId });
        if (eventId) await markWebhookFailed(supabase, eventId, "Secondary verification failed");
        return NextResponse.json({ received: true });
      }
    } catch (e) {
      // Network error — non-fatal, proceed. finalizeOrderPayment is idempotent.
      console.error("[Flutterwave webhook] Verify API error — proceeding", e);
    }
  }

  // 9. Resolve order + transaction via transactions table (Option B)
  const resolved = await resolveByTxRef(supabase, txData.tx_ref);

  if (!resolved) {
    console.warn("[Flutterwave webhook] No transaction row found for tx_ref", txData.tx_ref);
    if (eventId) await markWebhookFailed(supabase, eventId, "Transaction record not found");
    return NextResponse.json({ received: true });
  }

  const { orderId, transactionId } = resolved;

  // 10. Fetch order — include vendor_id + amounts for wallet credit
  const { data: order } = await supabase
    .from("orders")
    .select("id, payment_status, buyer_id, vendor_id, total_amount, currency")
    .eq("id", orderId)
    .single();

  if (!order) {
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
        .update({ webhook_event_id: eventId, updated_at: new Date().toISOString() })
        .eq("id", transactionId),
    ]);
  }

  // 12. Idempotent short-circuit — catches both "paid" (set by status route)
  //     and "completed" (set by finalizeOrderPayment).
  //     FIX: previous version only checked "completed", so if status/route.ts
  //     ran first and set payment_status = "paid", the webhook would call
  //     finalizeOrderPayment a second time.
  if (order.payment_status === "completed" || order.payment_status === "paid") {
    console.info("[Flutterwave webhook] Order already finalized, skipping", {
      orderId,
      paymentStatus: order.payment_status,
    });
    if (eventId) await markWebhookProcessed(supabase, eventId, orderId);
    return NextResponse.json({ received: true, status: "already_processed" });
  }

  // 13. Finalize order + credit vendor wallet
  try {
    await finalizeOrderPayment(supabase, orderId, {
      providerTransactionId: txId,
      providerReference: txData.tx_ref,
      paidAtIso: new Date().toISOString(),
      notifyUserId: order.buyer_id ?? null,
      paymentProvider: "flutterwave",
      webhookReference: idempotencyKey,
    });

    // Mark transaction completed
    await supabase
      .from("transactions")
      .update({ status: "completed", updated_at: new Date().toISOString() })
      .eq("id", transactionId);

    // FIX: credit vendor wallet — was missing from webhook path.
    // Without this, vendors only got credited if the buyer visited the
    // success page (status route) before the webhook fired.
    if (order.vendor_id) {
      await creditVendorWallet(supabase, {
        vendorId: order.vendor_id,
        totalAmount: Number(order.total_amount),
        currency: order.currency ?? "RWF",
        orderId,
      });
    } else {
      console.warn("[Flutterwave webhook] No vendor on order — wallet credit skipped", {
        orderId,
      });
    }

    console.log("[Flutterwave webhook] ✓ Order finalized + wallet credited:", orderId);
    if (eventId) await markWebhookProcessed(supabase, eventId, orderId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[Flutterwave webhook] ✗ Finalize failed:", msg);
    if (eventId) await markWebhookFailed(supabase, eventId, msg);
  }

  return NextResponse.json({ received: true });
}