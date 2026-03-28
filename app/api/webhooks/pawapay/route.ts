import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { finalizeOrderPayment } from "@/lib/payments/finalize-order-payment";
import { checkDepositStatus, getPawaPayConfig } from "@/lib/pawapay";

export const dynamic = "force-dynamic";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
});

type Body = {
  depositId?: string;
  status?: string;
  failureReason?: unknown;
  providerTransactionId?: string;
  amount?: string;
};

export async function POST(req: NextRequest) {
  try {
    getPawaPayConfig();
  } catch (e) {
    console.error("[webhooks/pawapay]", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const depositId = body.depositId?.trim();
  if (!depositId) {
    return NextResponse.json({ error: "missing depositId" }, { status: 400 });
  }

  const status = (body.status || "").toUpperCase();

  const { data: order } = await supabase
    .from("orders")
    .select("id, buyer_id, payment_status")
    .eq("pawapay_deposit_id", depositId)
    .maybeSingle();

  if (!order) {
    console.warn("[webhooks/pawapay] no order for deposit", depositId);
    return NextResponse.json({ received: true });
  }

  if (order.payment_status === "completed") {
    return NextResponse.json({ received: true });
  }

  const patchGateway = { gateway_used: "pawapay" as const };

  if (status === "FAILED" || status === "REJECTED" || status === "CANCELLED") {
    await supabase
      .from("orders")
      .update({ payment_status: "failed", ...patchGateway })
      .eq("id", order.id);
    return NextResponse.json({ received: true });
  }

  if (status !== "COMPLETED") {
    return NextResponse.json({ received: true });
  }

  try {
    const remote = await checkDepositStatus(depositId);
    if (remote.status && remote.status !== "COMPLETED") {
      console.warn("[webhooks/pawapay] verify mismatch", depositId, remote.status);
    }
  } catch (e) {
    console.error("[webhooks/pawapay] verify failed", e);
  }

  const paidAtIso = new Date().toISOString();
  const providerTx = body.providerTransactionId || depositId;

  try {
    await finalizeOrderPayment(supabase, order.id, {
      providerTransactionId: providerTx,
      providerReference: depositId,
      paidAtIso,
      notifyUserId: order.buyer_id,
      amountForMessage: body.amount ? Number(body.amount) : null,
      webhookReference: depositId,
      paymentProvider: "pawapay",
    });
    await supabase.from("orders").update(patchGateway).eq("id", order.id);
  } catch (e) {
    console.error("[webhooks/pawapay] finalize", e);
  }

  return NextResponse.json({ received: true });
}
