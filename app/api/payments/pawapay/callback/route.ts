/**
 * app/api/payments/pawapay/callback/route.ts
 *
 * PawaPay Deposit Callback — fail closed: never finalize from callback body alone.
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { finalizeOrderPayment } from "@/lib/payments/finalize-order-payment";
import { confirmPawaPayDepositCompleted } from "@/lib/payments/confirm-pawapay-deposit";
import { getSupabaseSecretKey, getSupabaseUrl } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

const supabase = createClient(
  getSupabaseUrl(),
  getSupabaseSecretKey(),
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(request: Request) {
  try {
    let body: Record<string, unknown> = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const depositId =
      (body.depositId as string) ||
      ((body.data as Record<string, unknown>)?.depositId as string) ||
      null;

    if (!depositId) {
      return NextResponse.json({ received: true });
    }

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("id, payment_status, buyer_id")
      .eq("pawapay_deposit_id", depositId)
      .maybeSingle();

    if (orderErr || !order) {
      return NextResponse.json({ received: true });
    }

    if (order.payment_status === "completed") {
      return NextResponse.json({ received: true });
    }

    const confirmed = await confirmPawaPayDepositCompleted(depositId);
    if (!confirmed) {
      return NextResponse.json({ received: true, verified: false });
    }

    await finalizeOrderPayment(supabase, order.id, {
      providerTransactionId: depositId,
      providerReference: depositId,
      paidAtIso: new Date().toISOString(),
      notifyUserId: order.buyer_id,
      paymentProvider: "pawapay",
      webhookReference: `pawapay-deposit-${depositId}`,
    });

    await supabase
      .from("orders")
      .update({
        gateway_used: "pawapay",
        payment_provider: "pawapay",
        pawapay_deposit_id: depositId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[PawaPay Callback] Unhandled error:", msg);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
