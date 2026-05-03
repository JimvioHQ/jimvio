import { NextRequest, NextResponse } from 'next/server';
import { verifyPesapalTransaction } from '@/lib/pesapal';
import { createClient } from "@supabase/supabase-js";
import { finalizeOrderPayment } from "@/lib/payments/finalize-order-payment";
import {
  logWebhookEvent,
  markWebhookProcessed,
  markWebhookFailed,
} from "@/lib/payments/webhook-logger";

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

/**
 * CALLBACK HANDLER
 * Endpoint: /api/pesapal/callback
 * Method: GET
 * Handles the user redirect back from PesaPal.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const trackingId = searchParams.get('OrderTrackingId');
  const merchantRef = searchParams.get('OrderMerchantReference');

  if (!trackingId) {
    console.error("[PesaPal Callback] Missing OrderTrackingId");
    return NextResponse.redirect(new URL('/checkout/error?msg=Missing tracking ID', req.url));
  }

  try {
    // 1. Verify payment status securely via PesaPal API
    const statusData = await verifyPesapalTransaction(trackingId);
    
    // PesaPal status values: 0 = Pending, 1 = Completed, 2 = Failed, 3 = Cancelled
    const statusCode = statusData.status_code;
    const isSuccess = statusCode === 1;
    const isFailed = statusCode === 2 || statusCode === 3;

    // 2. Resolve Order ID
    // merchantRef was set to orderId during initiation (or orderId:batchId)
    const orderId = merchantRef ? merchantRef.split(':')[0] : null;

    if (!orderId) {
       console.error(`[PesaPal Callback] Could not resolve orderId from merchantRef: ${merchantRef}`);
       return NextResponse.redirect(new URL(`/checkout/error?msg=Order reference missing`, req.url));
    }

    const idempotencyKey = `pesapal-${trackingId}-${statusCode}`;

    // 3. Idempotency & Audit Log
    const { isDuplicate, eventId } = await logWebhookEvent(supabase, {
      provider: "pesapal",
      idempotencyKey,
      payload: statusData,
      orderId,
    });

    if (isDuplicate) {
      console.log(`[PesaPal Callback] Duplicate event for order ${orderId}.`);
      return NextResponse.redirect(new URL(`/checkout/success?order=${orderId}`, req.url));
    }

    // 4. Resolve Order from DB
    const { data: order } = await supabase
      .from("orders")
      .select("id, payment_status, buyer_id")
      .eq("id", orderId)
      .maybeSingle();

    if (!order) {
      console.warn(`[PesaPal Callback] Order ${orderId} not found in DB.`);
      if (eventId) await markWebhookFailed(supabase, eventId, "Order not found");
      return NextResponse.redirect(new URL(`/checkout/error?msg=Order not found`, req.url));
    }

    // Already finalized?
    if (order.payment_status === "completed") {
      if (eventId) await markWebhookProcessed(supabase, eventId, orderId);
      return NextResponse.redirect(new URL(`/checkout/success?order=${orderId}`, req.url));
    }

    // 5. Handle Terminal Failure
    if (isFailed) {
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
      return NextResponse.redirect(new URL(`/checkout/error?msg=Payment failed`, req.url));
    }

    // 6. Finalization (on Success)
    if (isSuccess) {
      try {
        await finalizeOrderPayment(supabase, orderId, {
          providerTransactionId: trackingId,
          providerReference: merchantRef || trackingId,
          paidAtIso: new Date().toISOString(),
          notifyUserId: order.buyer_id,
          paymentProvider: "pesapal",
          webhookReference: idempotencyKey,
        });

        await supabase
          .from("orders")
          .update({
            gateway_used: "pesapal",
            payment_provider: "pesapal",
            pesapal_tracking_id: trackingId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", orderId);

        console.log(`[PesaPal Callback] ✓ Order finalized: ${orderId}`);
        if (eventId) await markWebhookProcessed(supabase, eventId, orderId);
        
        return NextResponse.redirect(new URL(`/checkout/success?order=${orderId}&tracking_id=${trackingId}`, req.url));
      } catch (e: any) {
        const msg = e.message || String(e);
        console.error(`[PesaPal Callback] ✗ Finalization failed: ${msg}`);
        if (eventId) await markWebhookFailed(supabase, eventId, msg);
        return NextResponse.redirect(new URL(`/checkout/error?msg=Order finalization failed`, req.url));
      }
    }

    // 7. Fallback for Pending items
    return NextResponse.redirect(new URL(`/checkout/status?order=${orderId}&status=pending`, req.url));

  } catch (error: any) {
    console.error('[PesaPal Callback API] Fatal Error:', error);
    return NextResponse.redirect(new URL('/checkout/error?msg=Internal server error', req.url));
  }
}
