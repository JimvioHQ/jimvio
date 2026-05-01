// app/api/payments/flutterwave/callback/route.ts
// Called when Flutterwave redirects buyer back after payment.
// Server-side verification before triggering order finalization.
// Note: the async webhook may arrive before or after this redirect.
// finalizeOrderPayment is idempotent — safe to call from both.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyFlutterwaveTransaction } from "@/lib/flutterwave";
import { finalizeOrderPayment } from "@/lib/payments/finalize-order-payment";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const txRef = searchParams.get("tx_ref");
  const transactionId = searchParams.get("transaction_id");
  const orderId = searchParams.get("order");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";

  if (status !== "successful" || !txRef || !transactionId) {
    return NextResponse.redirect(`${appUrl}/checkout/cancel?reason=flutterwave_failed&order=${orderId || ""}`);
  }

  try {
    // Always verify server-side — never trust redirect params alone
    const txData = await verifyFlutterwaveTransaction(transactionId);

    if (txData.status !== "successful") {
      return NextResponse.redirect(`${appUrl}/checkout/cancel?reason=verification_failed&order=${orderId || ""}`);
    }

    // Find order by tx_ref
    const { data: order } = await supabase
      .from("orders")
      .select("id, buyer_id, payment_status")
      .eq("flutterwave_tx_ref", txRef)
      .maybeSingle();

    const resolvedOrderId = order?.id || orderId;
    if (!resolvedOrderId) {
      return NextResponse.redirect(`${appUrl}/checkout/cancel?reason=order_not_found`);
    }

    // Already completed (webhook arrived first) — go straight to success
    if (order?.payment_status === "completed") {
      return NextResponse.redirect(`${appUrl}/checkout/success?order=${resolvedOrderId}`);
    }

    // Finalize — idempotent, handles wallet credit + notifications
    await finalizeOrderPayment(supabase, resolvedOrderId, {
      providerTransactionId: transactionId,
      providerReference: txRef,
      paidAtIso: new Date().toISOString(),
      notifyUserId: order?.buyer_id ?? null,
      paymentProvider: "flutterwave",
      webhookReference: `flw-${transactionId}`,
    });

    await supabase
      .from("orders")
      .update({
        gateway_used: "flutterwave",
        payment_provider: "flutterwave",
        flutterwave_transaction_id: Number(transactionId),
        updated_at: new Date().toISOString(),
        flutterwave_tx_ref: txRef,
        payment_status: "completed",
      })
      .eq("id", resolvedOrderId);

    return NextResponse.redirect(`${appUrl}/checkout/success?order=${resolvedOrderId}`);
  } catch (err) {
    console.error("[Flutterwave callback]", err);
    return NextResponse.redirect(`${appUrl}/checkout/cancel?reason=server_error&order=${orderId || ""}`);
  }
}
