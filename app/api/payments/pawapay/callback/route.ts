import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { finalizeOrderPayment } from "@/lib/payments/finalize-order-payment";
import { ensureNativeVendorCreditsApplied } from "@/lib/payments/credit-vendors-for-native-order";
import { checkDepositStatus, getPawaPayConfig } from "@/lib/pawapay";

export const dynamic = "force-dynamic";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
});

type V2DepositCallback = {
  depositId?: string;
  status?: string;
  providerTransactionId?: string;
  amount?: string;
  currency?: string;
  failureReason?: { failureCode?: string; failureMessage?: string };
};

export async function POST(req: NextRequest) {
  try {
    getPawaPayConfig();
  } catch (e) {
    console.error("[PawaPay callback]", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  let body: V2DepositCallback;
  try {
    body = (await req.json()) as V2DepositCallback;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const depositId = body.depositId?.trim();
  if (!depositId) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const status = body.status;

  if (status === "FAILED") {
    console.warn("[PawaPay callback] FAILED", depositId, body.failureReason);
    return NextResponse.json({ received: true });
  }

  if (status !== "COMPLETED") {
    return NextResponse.json({ received: true });
  }

  try {
    const remote = await checkDepositStatus(depositId);
    if (remote.status && remote.status !== "COMPLETED") {
      console.warn("[PawaPay callback] Status mismatch after verify", depositId, remote.status);
    }
  } catch (e) {
    console.error("[PawaPay callback] verify failed", e);
  }

  const { data: order } = await supabase
    .from("orders")
    .select("id, buyer_id, payment_status")
    .eq("pawapay_deposit_id", depositId)
    .maybeSingle();

  if (!order) {
    console.warn("[PawaPay callback] No order for deposit", depositId);
    return NextResponse.json({ received: true });
  }

  const orderId = order.id;

  if (order.payment_status === "completed") {
    try {
      await ensureNativeVendorCreditsApplied(supabase, orderId, {
        providerTransactionId: body.providerTransactionId || depositId,
        paymentProvider: "pawapay",
      });
    } catch (e) {
      console.error("[PawaPay callback] ensureNativeVendorCreditsApplied", e);
    }
    return NextResponse.json({ received: true });
  }

  const paidAtIso = new Date().toISOString();
  const providerTx = body.providerTransactionId || depositId;

  try {
    await finalizeOrderPayment(supabase, orderId, {
      providerTransactionId: providerTx,
      providerReference: depositId,
      paidAtIso,
      notifyUserId: order.buyer_id,
      amountForMessage: body.amount ? Number(body.amount) : null,
      webhookReference: depositId,
      paymentProvider: "pawapay",
    });
  } catch (e) {
    console.error("[PawaPay callback] finalize", e);
  }

  return NextResponse.json({ received: true });
}
