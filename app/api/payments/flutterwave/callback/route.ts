// app/api/payments/flutterwave/callback/route.ts
// Called when Flutterwave redirects buyer back after payment.
// We verify the transaction server-side before marking the order paid.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyFlutterwaveTransaction } from "@/lib/flutterwave";
import { handleSuccessfulPayment } from "@/services/paymentService";

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
    return NextResponse.redirect(`${appUrl}/checkout/cancel?reason=flutterwave_failed`);
  }

  try {
    // Always verify server-side — never trust redirect params alone
    const txData = await verifyFlutterwaveTransaction(transactionId);

    if (txData.status !== "successful") {
      return NextResponse.redirect(`${appUrl}/checkout/cancel?reason=verification_failed`);
    }

    // Find order by tx_ref
    const { data: order } = await supabase
      .from("orders")
      .select("id, payment_status, payment_batch_id")
      .eq("flutterwave_tx_ref", txRef)
      .maybeSingle();

    const resolvedOrderId = order?.id || orderId;
    if (!resolvedOrderId) {
      return NextResponse.redirect(`${appUrl}/checkout/cancel?reason=order_not_found`);
    }

    if (order?.payment_status === "paid") {
      return NextResponse.redirect(`${appUrl}/checkout/success?order=${resolvedOrderId}`);
    }

    // Update order(s) in the same batch
    const updateQuery = supabase.from("orders").update({
      payment_status: "paid",
      status: "processing",
      payment_provider: "flutterwave",
      flutterwave_transaction_id: Number(transactionId),
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (order?.payment_batch_id) {
      await updateQuery.eq("payment_batch_id", order.payment_batch_id);
    } else {
      await updateQuery.eq("id", resolvedOrderId);
    }

    // Run post-payment logic (Shopify orders, vendor wallet credits)
    await handleSuccessfulPayment({
      jimvioOrderId: resolvedOrderId,
      paymentProvider: "flutterwave" as never,
      paymentRef: txRef,
      paymentId: transactionId,
    });

    return NextResponse.redirect(`${appUrl}/checkout/success?order=${resolvedOrderId}`);
  } catch (err) {
    console.error("[Flutterwave callback]", err);
    return NextResponse.redirect(`${appUrl}/checkout/cancel?reason=server_error`);
  }
}
