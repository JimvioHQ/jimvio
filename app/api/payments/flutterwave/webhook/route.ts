// app/api/payments/flutterwave/webhook/route.ts
// Flutterwave sends async POST webhook for every payment event.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { validateFlutterwaveWebhook, verifyFlutterwaveTransaction } from "@/lib/flutterwave";
import { handleSuccessfulPayment } from "@/services/paymentService";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("verif-hash");

  // Validate using FLUTTERWAVE_WEBHOOK_HASH secret
  if (!validateFlutterwaveWebhook(rawBody, signature)) {
    console.warn("[Flutterwave webhook] Invalid signature");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let event: { event?: string; data?: { id?: number; tx_ref?: string; status?: string } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const txData = event.data;
  if (!txData?.tx_ref) {
    return NextResponse.json({ received: true });
  }

  if (txData.status !== "successful") {
    if (txData.status === "failed") {
      await supabase
        .from("orders")
        .update({ payment_status: "failed", status: "cancelled", updated_at: new Date().toISOString() })
        .eq("flutterwave_tx_ref", txData.tx_ref);
    }
    return NextResponse.json({ received: true });
  }

  // Double-verify with Flutterwave API
  try {
    if (txData.id) {
      const verified = await verifyFlutterwaveTransaction(txData.id);
      if (verified.status !== "successful") {
        return NextResponse.json({ received: true });
      }
    }
  } catch (e) {
    console.error("[Flutterwave webhook] verify failed", e);
  }

  const { data: order } = await supabase
    .from("orders")
    .select("id, payment_status, payment_batch_id")
    .eq("flutterwave_tx_ref", txData.tx_ref)
    .maybeSingle();

  if (!order) {
    console.warn("[Flutterwave webhook] No order for tx_ref", txData.tx_ref);
    return NextResponse.json({ received: true });
  }

  if (order.payment_status === "paid") {
    return NextResponse.json({ received: true, status: "already_processed" });
  }

  const patch = supabase.from("orders").update({
    payment_status: "paid",
    status: "processing",
    payment_provider: "flutterwave",
    flutterwave_transaction_id: txData.id ?? null,
    paid_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  if (order.payment_batch_id) {
    await patch.eq("payment_batch_id", order.payment_batch_id);
  } else {
    await patch.eq("id", order.id);
  }

  try {
    await handleSuccessfulPayment({
      jimvioOrderId: order.id,
      paymentProvider: "flutterwave" as never,
      paymentRef: txData.tx_ref,
      paymentId: String(txData.id ?? ""),
    });
  } catch (e) {
    console.error("[Flutterwave webhook] handleSuccessfulPayment", e);
  }

  return NextResponse.json({ received: true });
}
