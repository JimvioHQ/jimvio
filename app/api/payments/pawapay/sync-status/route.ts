import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { finalizeOrderPayment } from "@/lib/payments/finalize-order-payment";
import { requireSessionUser, notFoundIfInvalidId } from "@/lib/auth/require-session";
import { confirmPawaPayDepositCompleted } from "@/lib/payments/confirm-pawapay-deposit";
import { getSupabaseSecretKey, getSupabaseUrl } from "@/lib/supabase/service-role";

const supabase = createClient(
  getSupabaseUrl(),
  getSupabaseSecretKey(),
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(request: Request) {
  try {
    const session = await requireSessionUser();
    if ("error" in session) return session.error;

    const { orderId, trackingId } = await request.json();

    if (!orderId || !trackingId) {
      return NextResponse.json({ error: "Missing orderId or trackingId" }, { status: 400 });
    }
    const bad = notFoundIfInvalidId(orderId);
    if (bad) return bad;

    const { data: order } = await supabase
      .from("orders")
      .select("id, payment_status, buyer_id")
      .eq("id", orderId)
      .eq("buyer_id", session.user.id)
      .maybeSingle();
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const confirmed = await confirmPawaPayDepositCompleted(String(trackingId));
    if (!confirmed) {
      return NextResponse.json({ error: "Verification failed" }, { status: 400 });
    }

    if (order.payment_status === "completed") {
      return NextResponse.json({ status: "ALREADY_COMPLETED" });
    }

    await finalizeOrderPayment(supabase, orderId, {
      providerTransactionId: trackingId,
      providerReference: trackingId,
      paidAtIso: new Date().toISOString(),
      notifyUserId: order.buyer_id,
      paymentProvider: "pawapay",
      webhookReference: `deposit:${trackingId}`,
    });

    await supabase
      .from("orders")
      .update({
        gateway_used: "pawapay",
        payment_provider: "pawapay",
      })
      .eq("id", orderId);

    return NextResponse.json({ status: "COMPLETED" });
  } catch (error: unknown) {
    console.error("pawapay sync-status error:", error instanceof Error ? error.message : "error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
