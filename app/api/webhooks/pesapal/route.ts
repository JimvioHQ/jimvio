import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { finalizeOrderPayment } from "@/lib/payments/finalize-order-payment";
import { verifyPesapalTransaction } from "@/lib/pesapal";

export const dynamic = "force-dynamic";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const orderTrackingId =
    url.searchParams.get("OrderTrackingId") ||
    url.searchParams.get("order_tracking_id") ||
    url.searchParams.get("OrderTrackingID");
  const orderMerchantReference =
    url.searchParams.get("OrderMerchantReference") ||
    url.searchParams.get("order_merchant_reference") ||
    url.searchParams.get("merchant_reference");

  if (!orderTrackingId || !orderMerchantReference) {
    return NextResponse.json({ received: true });
  }

  // 1. Fetch official status from PesaPal to be secure
  let statusResponse;
  try {
    statusResponse = await verifyPesapalTransaction(orderTrackingId);
  } catch (err) {
    console.error("[webhooks/pesapal] verify failed", err);
    return NextResponse.json({ received: true });
  }

  // PesaPal statuses: COMPLETED, FAILED, INVALID, REVERSED
  const pStatus = (statusResponse.status_code || "").toString().toUpperCase();
  const paymentMethod = statusResponse.payment_method || "pesapal";

  // 2. Find the order(s) by tracking ID or merchant ref (which includes our UUID)
  const ref = orderMerchantReference.trim();
  const jimvioOrderId = ref.split(":")[0]; // Strip our unique timestamp suffix

  const { data: order } = await supabase
    .from("orders")
    .select("id, buyer_id, payment_status")
    .eq("id", jimvioOrderId)
    .maybeSingle();

  if (!order) {
    console.warn("[webhooks/pesapal] order not found", jimvioOrderId);
    return NextResponse.json({ received: true });
  }

  if (order.payment_status === "completed") {
    return NextResponse.json({ received: true });
  }

  // 3. Update or Finalize
  if (pStatus === "COMPLETED") {
    try {
      await finalizeOrderPayment(supabase, order.id, {
        providerTransactionId: statusResponse.payment_status_description || orderTrackingId,
        providerReference: orderTrackingId,
        paidAtIso: new Date().toISOString(),
        notifyUserId: order.buyer_id,
        webhookReference: orderTrackingId,
        paymentProvider: "pesapal",
      });
      // Ensure gateway_used is set
      await supabase.from("orders").update({ 
        gateway_used: "pesapal",
        pesapal_tracking_id: orderTrackingId,
        payment_provider: "pesapal"
      }).eq("id", order.id);
    } catch (err) {
      console.error("[webhooks/pesapal] finalize failed", err);
    }
  } else if (pStatus === "FAILED" || pStatus === "INVALID") {
    await supabase.from("orders").update({ 
      payment_status: "failed",
      gateway_used: "pesapal"
    }).eq("id", order.id);
  }

  return NextResponse.json({ received: true });
}
