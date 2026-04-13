import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { finalizeOrderPayment } from "@/lib/payments/finalize-order-payment";
import {
  logWebhookEvent,
  markWebhookProcessed,
  markWebhookFailed,
} from "@/lib/payments/webhook-logger";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("[AfriPay Callback] Received:", JSON.stringify(body));

    const { status, amount, transaction_ref, client_token } = body;

    if (!status || !transaction_ref || !client_token) {
      console.error("[AfriPay Callback] Missing required fields.");
      return NextResponse.json({ success: false, message: "Missing fields" }, { status: 200 });
    }

    const orderId = client_token; // jimvio order id passed as client_token during initiation
    const isSuccess = String(status).toUpperCase() === "SUCCESS";
    const idempotencyKey = `afripay-${transaction_ref}-${status}`;

    // 1. Idempotency Check
    const { isDuplicate, eventId } = await logWebhookEvent(supabase, {
      provider: "afripay",
      idempotencyKey,
      payload: body,
      orderId: orderId,
    });

    if (isDuplicate) {
      console.log(`[AfriPay Callback] Duplicate event for order ${orderId}. Skipping.`);
      return NextResponse.json({ success: true, message: "Already processed" }, { status: 200 });
    }

    // 2. Resolve Order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, payment_status, buyer_id")
      .eq("id", orderId)
      .maybeSingle();

    if (orderError || !order) {
       console.error(`[AfriPay Callback] Order not found: ${orderId}`);
       if (eventId) await markWebhookFailed(supabase, eventId, "Order not found");
       return NextResponse.json({ success: false, message: "Order not found" }, { status: 200 });
    }

    if (order.payment_status === "completed") {
       console.log(`[AfriPay Callback] Order ${orderId} already completed.`);
       if (eventId) await markWebhookProcessed(supabase, eventId, orderId);
       return NextResponse.json({ success: true, message: "Already complete" }, { status: 200 });
    }

    // 3. Handle Failure
    if (!isSuccess) {
       console.log(`[AfriPay Callback] Payment failed for order ${orderId}.`);
       await supabase
         .from("orders")
         .update({ 
           payment_status: "failed", 
           status: "cancelled", 
           updated_at: new Date().toISOString() 
         })
         .eq("id", orderId)
         .neq("payment_status", "completed");
       
       if (eventId) await markWebhookProcessed(supabase, eventId, orderId);
       return NextResponse.json({ success: true, message: "Payment failure handled" }, { status: 200 });
    }

    // 4. Finalize Payment
    try {
      await finalizeOrderPayment(supabase, orderId, {
        providerTransactionId: transaction_ref,
        providerReference: transaction_ref,
        paidAtIso: new Date().toISOString(),
        notifyUserId: order.buyer_id,
        paymentProvider: "afripay",
        webhookReference: idempotencyKey,
      });

      await supabase
        .from("orders")
        .update({
          gateway_used: "afripay",
          payment_provider: "afripay",
          afripay_reference: transaction_ref,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      console.log(`[AfriPay Callback] ✓ Order finalized: ${orderId}`);
      if (eventId) await markWebhookProcessed(supabase, eventId, orderId);
    } catch (e: any) {
      const msg = e.message || String(e);
      console.error(`[AfriPay Callback] ✗ Finalization failed: ${msg}`);
      if (eventId) await markWebhookFailed(supabase, eventId, msg);
    }

    return NextResponse.json({ success: true, message: "Callback processed" }, { status: 200 });

  } catch (error: any) {
    console.error("[AfriPay Callback] Fatal Error:", error.message);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 200 });
  }
}
