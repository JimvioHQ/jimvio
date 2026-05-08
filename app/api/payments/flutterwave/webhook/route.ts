
// import { NextRequest, NextResponse } from "next/server";
// import { createClient, SupabaseClient } from "@supabase/supabase-js";
// import {
//   validateFlutterwaveWebhook,
//   verifyFlutterwaveTransaction,
// } from "@/lib/flutterwave";
// import { finalizeOrderPayment } from "@/lib/payments/finalize-order-payment";
// import {
//   markWebhookProcessed,
//   markWebhookFailed,
// } from "@/lib/payments/webhook-logger";

// export const dynamic = "force-dynamic";

// // ─── Supabase ────────────────────────────────────────────────────────────────

// function getSupabase(): SupabaseClient {
//   const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
//   const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
//   if (!url || !key) throw new Error("Supabase env vars are not configured");
//   return createClient(url, key, {
//     auth: { autoRefreshToken: false, persistSession: false },
//   });
// }

// export async function GET(req: NextRequest) {
//   const adminKey = req.headers.get("x-admin-key");
//   if (adminKey !== process.env.ADMIN_SECRET_KEY) {
//     return NextResponse.json({ error: "Forbidden" }, { status: 403 });
//   }
//   return NextResponse.json({
//     ok: true,
//     message: "Flutterwave webhook endpoint is reachable",
//     ts: new Date().toISOString(),
//   });
// }

// async function resolveByTxRef(
//   supabase: SupabaseClient,
//   txRef: string
// ): Promise<{ orderId: string; transactionId: string } | null> {
//   const { data, error } = await supabase
//     .from("transactions")
//     .select("id, order_id")
//     .eq("provider", "flutterwave")
//     .eq("provider_transaction_id", txRef)
//     .maybeSingle();

//   if (error) {
//     console.error("[webhook] resolveByTxRef error", {
//       reason: error.message,
//       txRef,
//     });
//     return null;
//   }

//   if (!data?.order_id) {
//     console.warn("[webhook] No transaction found for tx_ref", { txRef });
//     return null;
//   }

//   return { orderId: data.order_id, transactionId: data.id };
// }


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

//   // 1. Get vendor user_id + commission rate
//   const { data: vendor, error: vendorError } = await supabase
//     .from("vendors")
//     .select("user_id, commission_rate")
//     .eq("id", vendorId)
//     .single();

//   if (vendorError || !vendor) {
//     console.error("[wallet/credit] Vendor not found", { vendorId, orderId });
//     return { credited: false };
//   }

//   // 2. Calculate net after platform commission
//   const commissionRate = Number(vendor.commission_rate ?? 0);
//   const netAmount      = totalAmount * (1 - commissionRate / 100);

//   // 3. Get vendor's wallet id
//   const { data: wallet, error: walletError } = await supabase
//     .from("wallets")
//     .select("id")
//     .eq("user_id", vendor.user_id)
//     .single();

//   if (walletError || !wallet) {
//     console.error("[wallet/credit] Wallet not found", {
//       vendorUserId: vendor.user_id,
//       orderId,
//     });
//     return { credited: false };
//   }

//   // 4. Atomic increment — no race condition
//   const { error: rpcError } = await supabase.rpc("increment_wallet_balance", {
//     p_wallet_id: wallet.id,
//     p_amount:    netAmount,
//   });

//   if (rpcError) {
//     console.error("[wallet/credit] RPC failed", {
//       reason: rpcError.message,
//       orderId,
//     });
//     return { credited: false };
//   }

//   console.info("[wallet/credit] ✓ Vendor wallet credited", {
//     vendorId,
//     netAmount,
//     currency,
//     orderId,
//   });

//   return { credited: true, netAmount };
// }

// async function logWebhookIdempotent(
//   supabase: SupabaseClient,
//   params: {
//     provider:        string;
//     idempotencyKey:  string;
//     payload:         unknown;
//     orderId:         string | null;
//   }
// ): Promise<{ eventId: string | null; isDuplicate: boolean }> {
//   const { data, error } = await supabase.rpc("log_webhook_idempotent", {
//     p_provider:        params.provider,
//     p_idempotency_key: params.idempotencyKey,
//     p_payload:         params.payload,
//     p_order_id:        params.orderId,
//   });

//   if (error) {
//     console.error("[webhook] logWebhookIdempotent RPC error", {
//       reason: error.message,
//     });
//     return { eventId: null, isDuplicate: false };
//   }

//   return {
//     eventId:     data?.[0]?.event_id     ?? null,
//     isDuplicate: data?.[0]?.is_duplicate ?? false,
//   };
// }

// // ─── POST handler ─────────────────────────────────────────────────────────────

// export async function POST(req: NextRequest) {
//   // 1. Read raw body FIRST — stream is consumed after first read
//   const rawBody   = await req.text();
//   const signature = req.headers.get("verif-hash");

//   // 2. Diagnostic log — if you never see this, the problem is network not code
//   console.info("[Flutterwave webhook] Incoming request", {
//     bodyLength:    rawBody.length,
//     hasBody:       rawBody.length > 0,
//     hasSignature:  !!signature,
//     secretPresent: !!process.env.FLUTTERWAVE_WEBHOOK_SECRET,
//     contentType:   req.headers.get("content-type"),
//   });

//   // 3. Signature validation
//   //    IMPORTANT: Flutterwave uses plain string compare — NOT HMAC like Stripe.
//   //    verif-hash header must equal FLUTTERWAVE_WEBHOOK_SECRET exactly.
//   //    Make sure validateFlutterwaveWebhook does: signature === secret
//   if (!validateFlutterwaveWebhook(rawBody, signature)) {
//     console.warn("[Flutterwave webhook] ✗ Signature validation failed", {
//       secretPresent: !!process.env.FLUTTERWAVE_WEBHOOK_SECRET,
//       signatureReceived: signature,
//     });
//     return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//   }

//   console.info("[Flutterwave webhook] ✓ Signature valid");

//   // 4. Parse payload
//   let event: {
//     event?: string;
//     data?:  { id?: number; tx_ref?: string; status?: string };
//   };

//   try {
//     event = JSON.parse(rawBody);
//   } catch {
//     console.error("[Flutterwave webhook] Invalid JSON body");
//     return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
//   }

//   const txData = event.data;

//   console.info("[Flutterwave webhook] Event parsed", {
//     event:    event.event,
//     txRef:    txData?.tx_ref,
//     txId:     txData?.id,
//     txStatus: txData?.status,
//   });

//   // Nothing actionable
//   if (!txData?.tx_ref) {
//     return NextResponse.json({ received: true });
//   }

//   const supabase = getSupabase();

//   // 5. Handle explicit failure events
//   if (txData.status === "failed") {
//     const resolved = await resolveByTxRef(supabase, txData.tx_ref);

//     if (resolved) {
//       const { orderId, transactionId } = resolved;

//       const { data: existingOrder } = await supabase
//         .from("orders")
//         .select("id, payment_status, buyer_id")
//         .eq("id", orderId)
//         .single();

//       // Never downgrade a completed/paid order
//       if (
//         existingOrder &&
//         existingOrder.payment_status !== "completed" &&
//         existingOrder.payment_status !== "paid"
//       ) {
//         await Promise.all([
//           supabase
//             .from("orders")
//             .update({
//               payment_status: "failed",
//               status:         "cancelled",
//               updated_at:     new Date().toISOString(),
//             })
//             .eq("id", orderId),

//           supabase
//             .from("transactions")
//             .update({
//               status:     "failed",
//               updated_at: new Date().toISOString(),
//             })
//             .eq("id", transactionId),

//           // Notify buyer
//           existingOrder.buyer_id
//             ? supabase.from("notifications").insert({
//                 user_id:    existingOrder.buyer_id,
//                 type:       "payment",
//                 title:      "Payment Failed",
//                 message:    "Your payment could not be processed. Please try again.",
//                 action_url: `/checkout?order=${orderId}`,
//               })
//             : Promise.resolve(),
//         ]);
//       }
//     }

//     return NextResponse.json({ received: true });
//   }

//   // 6. Ignore non-successful events
//   if (txData.status !== "successful") {
//     return NextResponse.json({ received: true });
//   }

//   const txId           = String(txData.id ?? txData.tx_ref);
//   const idempotencyKey = `flw-${txId}`;

//   // 7. Atomic idempotency — prevents double processing on retries
//   const { eventId, isDuplicate } = await logWebhookIdempotent(supabase, {
//     provider:       "flutterwave",
//     idempotencyKey,
//     payload:        event,
//     orderId:        null,
//   });

//   if (isDuplicate) {
//     console.info("[Flutterwave webhook] Duplicate — already processed", {
//       idempotencyKey,
//     });
//     return NextResponse.json({ received: true, duplicate: true });
//   }

//   // 8. Secondary verification with 4s timeout
//   //    Flutterwave expects response within 5s — timeout prevents hanging
//   if (txData.id) {
//     try {
//       const controller = new AbortController();
//       const timeout    = setTimeout(() => controller.abort(), 4000);

//       const verified = await verifyFlutterwaveTransaction(txData.id, {
//         signal: controller.signal,
//       });
//       clearTimeout(timeout);

//       if (verified.status !== "successful") {
//         console.warn("[Flutterwave webhook] ✗ Secondary verify failed", { txId });
//         if (eventId) await markWebhookFailed(supabase, eventId, "Secondary verification failed");
//         return NextResponse.json({ received: true });
//       }

//       console.info("[Flutterwave webhook] ✓ Secondary verify passed", { txId });
//     } catch (e) {
//       if (e instanceof Error && e.name === "AbortError") {
//         // Timed out — proceed rather than block. Idempotency key protects doubles.
//         console.warn("[Flutterwave webhook] Verify timed out after 4s — proceeding");
//       } else {
//         // Network error — non-fatal, proceed
//         console.error("[Flutterwave webhook] Verify API error — proceeding", e);
//       }
//     }
//   }

//   // 9. Resolve order via transactions table
//   //    Chain: txRef → transactions.provider_transaction_id → order_id → orders
//   const resolved = await resolveByTxRef(supabase, txData.tx_ref);

//   if (!resolved) {
//     console.warn("[Flutterwave webhook] No transaction row for tx_ref", {
//       txRef: txData.tx_ref,
//     });
//     if (eventId) await markWebhookFailed(supabase, eventId, "Transaction record not found");
//     return NextResponse.json({ received: true });
//   }

//   const { orderId, transactionId } = resolved;

//   // 10. Fetch full order
//   const { data: order, error: orderError } = await supabase
//     .from("orders")
//     .select("id, payment_status, buyer_id, vendor_id, total_amount, currency")
//     .eq("id", orderId)
//     .single();

//   if (orderError || !order) {
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
//         .update({
//           webhook_event_id: eventId,
//           updated_at:       new Date().toISOString(),
//         })
//         .eq("id", transactionId),
//     ]);
//   }

//   // 12. Short-circuit — catches both "paid" (set by status/callback route)
//   //     and "completed" (set by finalizeOrderPayment)
//   if (
//     order.payment_status === "completed" ||
//     order.payment_status === "paid"
//   ) {
//     console.info("[Flutterwave webhook] Order already finalized — skipping", {
//       orderId,
//       paymentStatus: order.payment_status,
//     });
//     if (eventId) await markWebhookProcessed(supabase, eventId, orderId);
//     return NextResponse.json({ received: true, status: "already_processed" });
//   }

//   // 13. Finalize order + credit vendor wallet
//   try {
//     // Finalize order — sets status, grants digital access, notifies buyer
//     await finalizeOrderPayment(supabase, orderId, {
//       providerTransactionId: txId,
//       providerReference:     txData.tx_ref,
//       paidAtIso:             new Date().toISOString(),
//       notifyUserId:          order.buyer_id ?? null,
//       paymentProvider:       "flutterwave",
//       webhookReference:      idempotencyKey,
//     });

//     // Mark transaction completed
//     await supabase
//       .from("transactions")
//       .update({
//         status:     "completed",
//         updated_at: new Date().toISOString(),
//       })
//       .eq("id", transactionId);

//     // Store gateway info in metadata — no extra columns needed
//     const { data: currentOrder } = await supabase
//       .from("orders")
//       .select("metadata")
//       .eq("id", orderId)
//       .single();

//     await supabase
//       .from("orders")
//       .update({
//         metadata: {
//           ...(currentOrder?.metadata ?? {}),
//           gateway_used:               "flutterwave",
//           payment_provider:           "flutterwave",
//           flutterwave_transaction_id: txData.id ?? null,
//           flutterwave_tx_ref:         txData.tx_ref,
//         },
//         updated_at: new Date().toISOString(),
//       })
//       .eq("id", orderId);

//     // Credit vendor wallet — atomic via RPC
//     if (order.vendor_id) {
//       await creditVendorWallet(supabase, {
//         vendorId:    order.vendor_id,
//         totalAmount: Number(order.total_amount),
//         currency:    order.currency ?? "RWF",
//         orderId,
//       });
//     } else {
//       console.warn("[Flutterwave webhook] No vendor on order — wallet skip", {
//         orderId,
//       });
//     }

//     console.log("[Flutterwave webhook] ✓ Order finalized + wallet credited", {
//       orderId,
//       transactionId,
//     });

//     if (eventId) await markWebhookProcessed(supabase, eventId, orderId);
//   } catch (e) {
//     const msg = e instanceof Error ? e.message : String(e);
//     console.error("[Flutterwave webhook] ✗ Finalize failed", { msg, orderId });
//     if (eventId) await markWebhookFailed(supabase, eventId, msg);
//   }

//   return NextResponse.json({ received: true });
// }
import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { verifyFlutterwaveTransaction } from "@/lib/flutterwave";
import { finalizeOrderPayment } from "@/lib/payments/finalize-order-payment";
import {
  markWebhookProcessed,
  markWebhookFailed,
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
  const secret = process.env.FLUTTERWAVE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[webhook] FLUTTERWAVE_WEBHOOK_SECRET is not set");
    return false;
  }

  // ── v4: HMAC-SHA256 via flutterwave-signature header ──
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
      // Buffer length mismatch — invalid signature
      return false;
    }
  }

  // ── Legacy v3: plain string compare via verif-hash header ──
  const verifHash = headers.get("verif-hash");
  if (verifHash) {
    return verifHash === secret;
  }

  console.warn(
    "[webhook] No signature header found (checked flutterwave-signature and verif-hash)"
  );
  return false;
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

  const { data: vendor, error: vendorError } = await supabase
    .from("vendors")
    .select("user_id, commission_rate")
    .eq("id", vendorId)
    .single();

  if (vendorError || !vendor) {
    console.error("[wallet/credit] Vendor not found", { vendorId, orderId });
    return { credited: false };
  }

  const commissionRate = Number(vendor.commission_rate ?? 0);
  const netAmount = totalAmount * (1 - commissionRate / 100);

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

  const { error: rpcError } = await supabase.rpc("increment_wallet_balance", {
    p_wallet_id: wallet.id,
    p_amount: netAmount,
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

async function logWebhookIdempotent(
  supabase: SupabaseClient,
  params: {
    provider: string;
    idempotencyKey: string;
    payload: unknown;
    orderId: string | null;
  }
): Promise<{ eventId: string | null; isDuplicate: boolean }> {
  const { data, error } = await supabase.rpc("log_webhook_idempotent", {
    p_provider: params.provider,
    p_idempotency_key: params.idempotencyKey,
    p_payload: params.payload,
    p_order_id: params.orderId,
  });

  if (error) {
    console.error("[webhook] logWebhookIdempotent RPC error", {
      reason: error.message,
    });
    return { eventId: null, isDuplicate: false };
  }

  return {
    eventId: data?.[0]?.event_id ?? null,
    isDuplicate: data?.[0]?.is_duplicate ?? false,
  };
}

// ─── POST handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // 1. Read raw body FIRST — stream is consumed after first read
  const rawBody = await req.text();

  // 2. Diagnostic log
  console.info("[Flutterwave webhook] Incoming request", {
    bodyLength: rawBody.length,
    hasSignatureV4: !!req.headers.get("flutterwave-signature"),
    hasSignatureLegacy: !!req.headers.get("verif-hash"),
    secretPresent: !!process.env.FLUTTERWAVE_WEBHOOK_SECRET,
    contentType: req.headers.get("content-type"),
  });

  // 3. Signature validation — supports both v3 (verif-hash) and v4 (flutterwave-signature)
  if (!validateFlutterwaveWebhook(rawBody, req.headers)) {
    console.warn("[Flutterwave webhook] ✗ Signature validation failed");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.info("[Flutterwave webhook] ✓ Signature valid");

  // 4. Parse payload
  let event: {
    event?: string; // v3 field
    type?: string; // v4 field (e.g. "charge.completed")
    data?: {
      id?: number;
      tx_ref?: string;
      status?: string;
    };
  };

  try {
    event = JSON.parse(rawBody);
  } catch {
    console.error("[Flutterwave webhook] Invalid JSON body");
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const txData = event.data;

  // Normalise event name — v3 uses event.event, v4 uses event.type
  const eventName = event.event ?? event.type;

  console.info("[Flutterwave webhook] Event parsed", {
    eventName,
    txRef: txData?.tx_ref,
    txId: txData?.id,
    txStatus: txData?.status,
  });

  if (!txData?.tx_ref) {
    return NextResponse.json({ received: true });
  }

  // FIX #1: Require txData.id to be a valid number — never fall back to tx_ref
  // as a numeric transaction ID. If it's missing, we still process but skip
  // secondary verification (which requires a numeric ID).
  const numericTxId: number | null =
    txData.id != null && Number.isFinite(Number(txData.id))
      ? Number(txData.id)
      : null;

  const supabase = getSupabase();

  // 5. Handle explicit failure events
  if (txData.status === "failed") {
    // FIX #7: Idempotency check on failure path to avoid duplicate updates/notifications
    const failureKey = `flw-fail-${txData.tx_ref}`;
    const { isDuplicate: isFailDuplicate } = await logWebhookIdempotent(
      supabase,
      {
        provider: "flutterwave",
        idempotencyKey: failureKey,
        payload: event,
        orderId: null,
      }
    );

    if (isFailDuplicate) {
      console.info(
        "[Flutterwave webhook] Duplicate failure event — skipping",
        { failureKey }
      );
      return NextResponse.json({ received: true, duplicate: true });
    }

    const resolved = await resolveByTxRef(supabase, txData.tx_ref);

    if (resolved) {
      const { orderId, transactionId } = resolved;
      const { data: existingOrder } = await supabase
        .from("orders")
        .select("id, payment_status, buyer_id")
        .eq("id", orderId)
        .single();

      // FIX #5: Use single canonical "paid" status check
      if (existingOrder && !isOrderFinalized(existingOrder.payment_status)) {
        await Promise.all([
          supabase
            .from("orders")
            .update({
              payment_status: "failed",
              status: "cancelled",
              updated_at: new Date().toISOString(),
            })
            .eq("id", orderId),
          supabase
            .from("transactions")
            .update({
              status: "failed",
              updated_at: new Date().toISOString(),
            })
            .eq("id", transactionId),
          existingOrder.buyer_id
            ? supabase.from("notifications").insert({
              user_id: existingOrder.buyer_id,
              type: "payment",
              title: "Payment Failed",
              message:
                "Your payment could not be processed. Please try again.",
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

  // FIX #1: Use the numeric Flutterwave transaction ID as the idempotency key.
  // Fall back to tx_ref only for the key string — never confuse it with a numeric ID.
  const idempotencyKey = numericTxId
    ? `flw-${numericTxId}`
    : `flw-ref-${txData.tx_ref}`;

  // 7. Idempotency check
  const { eventId, isDuplicate } = await logWebhookIdempotent(supabase, {
    provider: "flutterwave",
    idempotencyKey,
    payload: event,
    orderId: null,
  });

  if (isDuplicate) {
    console.info("[Flutterwave webhook] Duplicate — already processed", {
      idempotencyKey,
    });
    return NextResponse.json({ received: true, duplicate: true });
  }

  // 8. Secondary verification with 8s timeout
  // FIX #2: Distinguish timeout errors (proceed) from API errors (abort).
  if (numericTxId != null) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const verified = await verifyFlutterwaveTransaction(numericTxId, {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (verified.status !== "successful") {
        console.warn("[Flutterwave webhook] ✗ Secondary verify failed", {
          numericTxId,
        });
        if (eventId)
          await markWebhookFailed(
            supabase,
            eventId,
            "Secondary verification failed"
          );
        return NextResponse.json({ received: true });
      }

      console.info("[Flutterwave webhook] ✓ Secondary verify passed", {
        numericTxId,
      });
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        // Timeout — Flutterwave API was slow; proceed cautiously
        console.warn(
          "[Flutterwave webhook] Verify timed out after 8s — proceeding"
        );
      } else {
        // FIX #2: Any other API error (network, 401, 500, etc.) is treated as a
        // hard failure. Do NOT give value when we cannot confirm the transaction.
        const msg = e instanceof Error ? e.message : String(e);
        console.error(
          "[Flutterwave webhook] ✗ Verify API error — aborting",
          { msg, numericTxId }
        );
        if (eventId)
          await markWebhookFailed(
            supabase,
            eventId,
            `Verify API error: ${msg}`
          );
        return NextResponse.json({ received: true });
      }
    }
  } else {
    console.warn(
      "[Flutterwave webhook] No numeric txId — skipping secondary verify",
      { tx_ref: txData.tx_ref }
    );
  }

  // 9. Resolve order
  const resolved = await resolveByTxRef(supabase, txData.tx_ref);

  if (!resolved) {
    console.warn(
      "[Flutterwave webhook] No transaction row for tx_ref",
      { txRef: txData.tx_ref }
    );
    if (eventId)
      await markWebhookFailed(
        supabase,
        eventId,
        "Transaction record not found"
      );
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
    if (eventId)
      await markWebhookFailed(supabase, eventId, "Order not found");
    return NextResponse.json({ received: true });
  }

  // 11. Link webhook_event ↔ order and transaction
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

  // 12. Short-circuit if already finalized
  // FIX #5: Single canonical helper — no more dual-status string checks scattered around
  if (isOrderFinalized(order.payment_status)) {
    console.info(
      "[Flutterwave webhook] Order already finalized — skipping",
      { orderId, paymentStatus: order.payment_status }
    );
    if (eventId) await markWebhookProcessed(supabase, eventId, orderId);
    return NextResponse.json({ received: true, status: "already_processed" });
  }

  // 13. Finalize + credit wallet
  // FIX #3: Always pass the numeric Flutterwave transaction ID as providerTransactionId.
  //         Fall back to tx_ref string only when the numeric ID is unavailable, and
  //         make that explicit so downstream code can handle it appropriately.
  // FIX #4: The idempotency check + payment_status guard above already prevents most
  //         races, but finalizeOrderPayment should ideally use a DB-level lock
  //         (e.g. SELECT ... FOR UPDATE inside a transaction) to handle concurrent
  //         webhook deliveries atomically.
  // FIX #6: Metadata is merged inside the try block so a metadata write failure
  //         doesn't silently leave the order in a partially-updated state.
  try {
    await finalizeOrderPayment(supabase, orderId, {
      // FIX #3: Explicit numeric ID; never a tx_ref string masquerading as an ID
      providerTransactionId:
        numericTxId != null ? String(numericTxId) : txData.tx_ref,
      providerReference: txData.tx_ref,
      paidAtIso: new Date().toISOString(),
      notifyUserId: order.buyer_id ?? null,
      paymentProvider: "flutterwave",
      webhookReference: idempotencyKey,
    });

    // FIX #6: Batch transaction status + metadata update together so they fail/succeed atomically
    const { data: currentOrder } = await supabase
      .from("orders")
      .select("metadata")
      .eq("id", orderId)
      .single();

    await Promise.all([
      supabase
        .from("transactions")
        .update({
          status: "completed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", transactionId),

      supabase
        .from("orders")
        .update({
          metadata: {
            ...(currentOrder?.metadata ?? {}),
            gateway_used: "flutterwave",
            payment_provider: "flutterwave",
            // FIX #3: Store numeric ID separately from tx_ref — never conflate them
            flutterwave_transaction_id: numericTxId ?? null,
            flutterwave_tx_ref: txData.tx_ref,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId),
    ]);

    if (order.vendor_id) {
      await creditVendorWallet(supabase, {
        vendorId: order.vendor_id,
        totalAmount: Number(order.total_amount),
        currency: order.currency ?? "RWF",
        orderId,
      });
    }

    console.log(
      "[Flutterwave webhook] ✓ Order finalized + wallet credited",
      { orderId, transactionId }
    );
    if (eventId) await markWebhookProcessed(supabase, eventId, orderId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[Flutterwave webhook] ✗ Finalize failed", {
      msg,
      orderId,
    });
    if (eventId) await markWebhookFailed(supabase, eventId, msg);
  }

  return NextResponse.json({ received: true });
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

/**
 * FIX #5: Single canonical check for a finalized order.
 * Centralising this prevents drift when the set of terminal statuses changes.
 */
function isOrderFinalized(paymentStatus: string | null | undefined): boolean {
  return paymentStatus === "completed" || paymentStatus === "paid";
}