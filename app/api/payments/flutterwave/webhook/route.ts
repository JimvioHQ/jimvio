// // app/api/payments/flutterwave/webhook/route.ts
// // Flutterwave sends async POST webhook for every payment event.
// // Updated to use finalizeOrderPayment for consistent order + wallet handling.

// import { NextRequest, NextResponse } from "next/server";
// import { createClient } from "@supabase/supabase-js";
// import { validateFlutterwaveWebhook, verifyFlutterwaveTransaction } from "@/lib/flutterwave";
// import { finalizeOrderPayment } from "@/lib/payments/finalize-order-payment";
// import {
//   logWebhookEvent,
//   markWebhookProcessed,
//   markWebhookFailed,
// } from "@/lib/payments/webhook-logger";

// export const dynamic = "force-dynamic";

// const supabase = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.SUPABASE_SERVICE_ROLE_KEY!,
//   { auth: { autoRefreshToken: false, persistSession: false } }
// );

// export async function POST(req: NextRequest) {
//   const rawBody = await req.text();
//   const signature = req.headers.get("verif-hash");

//   if (!validateFlutterwaveWebhook(rawBody, signature)) {
//     console.warn("[Flutterwave webhook] Invalid signature");
//     return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//   }

//   let event: { event?: string; data?: { id?: number; tx_ref?: string; status?: string } };
//   try {
//     event = JSON.parse(rawBody);
//   } catch {
//     return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
//   }

//   const txData = event.data;
//   if (!txData?.tx_ref) {
//     return NextResponse.json({ received: true });
//   }

//   // Handle failure — mark order cancelled but never downgrade a completed order
//   if (txData.status === "failed") {
//     const { data: failedOrder } = await supabase
//       .from("orders")
//       .select("id, payment_status")
//       .eq("flutterwave_tx_ref", txData.tx_ref)
//       .maybeSingle();
//     if (failedOrder && failedOrder.payment_status !== "completed") {
//       await supabase
//         .from("orders")
//         .update({ payment_status: "failed", status: "cancelled", updated_at: new Date().toISOString() })
//         .eq("id", failedOrder.id);
//     }
//     return NextResponse.json({ received: true });
//   }

//   if (txData.status !== "successful") {
//     return NextResponse.json({ received: true });
//   }

//   const txId = String(txData.id ?? txData.tx_ref);

//   // Idempotency guard
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

//   // Secondary verification — confirm with Flutterwave API
//   if (txData.id) {
//     try {
//       const verified = await verifyFlutterwaveTransaction(txData.id);
//       if (verified.status !== "successful") {
//         console.warn("[Flutterwave webhook] Secondary verify failed for tx", txId);
//         if (eventId) await markWebhookFailed(supabase, eventId, "Secondary verification failed");
//         return NextResponse.json({ received: true });
//       }
//     } catch (e) {
//       console.error("[Flutterwave webhook] verify API error", e);
//       // Don't block on network errors — proceed
//     }
//   }

//   // Resolve order
//   const { data: order } = await supabase
//     .from("orders")
//     .select("id, payment_status, payment_batch_id, buyer_id")
//     .eq("flutterwave_tx_ref", txData.tx_ref)
//     .maybeSingle();

//   if (!order) {
//     console.warn("[Flutterwave webhook] No order for tx_ref", txData.tx_ref);
//     if (eventId) await markWebhookFailed(supabase, eventId, "Order not found");
//     return NextResponse.json({ received: true });
//   }

//   if (eventId) {
//     // Update event row with resolved order id
//     await supabase.from("webhook_events").update({ order_id: order.id }).eq("id", eventId);
//   }

//   if (order.payment_status === "completed") {
//     if (eventId) await markWebhookProcessed(supabase, eventId, order.id);
//     return NextResponse.json({ received: true, status: "already_processed" });
//   }

//   try {
//     await finalizeOrderPayment(supabase, order.id, {
//       providerTransactionId: txId,
//       providerReference: txData.tx_ref,
//       paidAtIso: new Date().toISOString(),
//       notifyUserId: order.buyer_id ?? null,
//       paymentProvider: "flutterwave",
//       webhookReference: idempotencyKey,
//     });

//     await supabase
//       .from("orders")
//       .update({
//         gateway_used: "flutterwave",
//         payment_provider: "flutterwave",
//         flutterwave_transaction_id: txData.id ?? null,
//         updated_at: new Date().toISOString(),
//       })
//       .eq("id", order.id);

//     console.log("[Flutterwave webhook] ✓ Order finalized:", order.id);
//     if (eventId) await markWebhookProcessed(supabase, eventId, order.id);
//   } catch (e) {
//     const msg = e instanceof Error ? e.message : String(e);
//     console.error("[Flutterwave webhook] ✗ finalize failed:", msg);
//     if (eventId) await markWebhookFailed(supabase, eventId, msg);
//   }

//   return NextResponse.json({ received: true });
// }

// app/api/payments/flutterwave/webhook/route.ts
// Flutterwave sends async POST webhook for every payment event.
// Order is resolved via the transactions table (provider_transaction_id = tx_ref)
// so no flutterwave_tx_ref column is needed on orders.
// app/api/payments/flutterwave/webhook/route.ts
//
// Design (Option B — no extra columns on orders):
//   initiate/route.ts writes: transactions { provider="flutterwave", provider_transaction_id=txRef, webhook_event_id=null }
//   This webhook resolves the order by querying that transactions row.
//   On success it:
//     1. Finalizes the order via finalizeOrderPayment()
//     2. Sets transactions.status = "completed"
//     3. Sets transactions.webhook_event_id = eventId  ← closes the relation
//   On failure it:
//     1. Marks the order cancelled (if not already completed)
//     2. Sets transactions.status = "failed"

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

// ─── Supabase client (lazy — matches initiate pattern) ────────────────────────

function getSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env vars are not configured");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ─── Resolve order + transaction via the transactions table ───────────────────
//
// initiate/route.ts inserts a transactions row with:
//   provider                = "flutterwave"
//   provider_transaction_id = txRef
//
// We look that row up here to get both the transaction id and the order id,
// so we never need flutterwave_tx_ref on the orders table.

async function resolveByTxRef(
  supabase: SupabaseClient,
  txRef: string
): Promise<{ orderId: string; transactionId: string } | null> {
  const { data, error } = await supabase
    .from("transactions")
    .select("id, order_id")
    .eq("provider", "flutterwave")
    .eq("provider_transaction_id", txRef)
    .single();

  if (error || !data?.order_id) return null;
  return { orderId: data.order_id as string, transactionId: data.id as string };
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("verif-hash");

  // 1. Validate Flutterwave webhook signature
  if (!validateFlutterwaveWebhook(rawBody, signature)) {
    console.warn("[Flutterwave webhook] Invalid signature");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse payload
  let event: { event?: string; data?: { id?: number; tx_ref?: string; status?: string } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const txData = event.data;

  // Nothing actionable in the payload — acknowledge and exit
  if (!txData?.tx_ref) {
    return NextResponse.json({ received: true });
  }

  const supabase = getSupabase();

  // 3. Handle explicit failure events
  //    Mark the order cancelled and the transaction failed.
  //    Never downgrade an order that already completed.
  if (txData.status === "failed") {
    const resolved = await resolveByTxRef(supabase, txData.tx_ref);

    if (resolved) {
      const { orderId, transactionId } = resolved;

      const { data: existingOrder } = await supabase
        .from("orders")
        .select("id, payment_status")
        .eq("id", orderId)
        .single();

      if (existingOrder && existingOrder.payment_status !== "completed") {
        await supabase
          .from("orders")
          .update({
            payment_status: "failed",
            status: "cancelled",
            updated_at: new Date().toISOString(),
          })
          .eq("id", orderId);
      }

      // Always sync the transaction row, even if order was already completed
      await supabase
        .from("transactions")
        .update({
          status: "failed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", transactionId);
    }

    return NextResponse.json({ received: true });
  }

  // 4. Ignore non-successful events (e.g. "pending", "cancelled" from Flutterwave)
  if (txData.status !== "successful") {
    return NextResponse.json({ received: true });
  }

  const txId = String(txData.id ?? txData.tx_ref);

  // 5. Idempotency guard — prevents double-processing on Flutterwave retries.
  //    logWebhookEvent inserts into webhook_events with a unique idempotency_key.
  //    If the key already exists it returns isDuplicate = true.
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

  // 6. Secondary verification — confirm with Flutterwave API before touching money.
  //    Network errors are non-fatal; finalizeOrderPayment is idempotent.
  if (txData.id) {
    try {
      const verified = await verifyFlutterwaveTransaction(txData.id);
      if (verified.status !== "successful") {
        console.warn("[Flutterwave webhook] Secondary verify failed for tx", txId);
        if (eventId) await markWebhookFailed(supabase, eventId, "Secondary verification failed");
        return NextResponse.json({ received: true });
      }
    } catch (e) {
      console.error("[Flutterwave webhook] verify API error — proceeding anyway", e);
    }
  }

  // 7. Resolve order + transaction via the transactions table (Option B)
  const resolved = await resolveByTxRef(supabase, txData.tx_ref);

  if (!resolved) {
    console.warn("[Flutterwave webhook] No transaction row found for tx_ref", txData.tx_ref);
    if (eventId) await markWebhookFailed(supabase, eventId, "Transaction record not found");
    return NextResponse.json({ received: true });
  }

  const { orderId, transactionId } = resolved;

  // 8. Fetch current order state
  const { data: order } = await supabase
    .from("orders")
    .select("id, payment_status, buyer_id")
    .eq("id", orderId)
    .single();

  if (!order) {
    console.warn("[Flutterwave webhook] Order not found for id", orderId);
    if (eventId) await markWebhookFailed(supabase, eventId, "Order not found");
    return NextResponse.json({ received: true });
  }

  // 9. Attach the resolved order id to the webhook_events row for traceability,
  //    and close the transactions <-> webhook_events relation by writing
  //    webhook_event_id back onto the transaction row.
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
          updated_at: new Date().toISOString(),
        })
        .eq("id", transactionId),
    ]);
  }

  // 10. Idempotent short-circuit — order was already completed by a prior webhook
  if (order.payment_status === "completed") {
    if (eventId) await markWebhookProcessed(supabase, eventId, orderId);
    return NextResponse.json({ received: true, status: "already_processed" });
  }

  // 11. Finalize the order — updates order status, wallet credits, commission records, etc.
  try {
    await finalizeOrderPayment(supabase, orderId, {
      providerTransactionId: txId,
      providerReference: txData.tx_ref,
      paidAtIso: new Date().toISOString(),
      notifyUserId: order.buyer_id ?? null,
      paymentProvider: "flutterwave",
      webhookReference: idempotencyKey,
    });

    // 12. Mark the pending transaction row as completed
    await supabase
      .from("transactions")
      .update({
        status: "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", transactionId);

    console.log("[Flutterwave webhook] ✓ Order finalized:", orderId);
    if (eventId) await markWebhookProcessed(supabase, eventId, orderId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[Flutterwave webhook] ✗ finalize failed:", msg);
    if (eventId) await markWebhookFailed(supabase, eventId, msg);
  }

  return NextResponse.json({ received: true });
}