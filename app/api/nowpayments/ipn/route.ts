import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { validateIPNSignature } from "@/services/nowpayments";
import { finalizeOrderPayment } from "@/lib/payments/finalize-order-payment";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-nowpayments-sig");
    const ipnSecret = process.env.NOWPAYMENTS_IPN_SECRET;

    if (!ipnSecret) {
      console.error("NOWPAYMENTS_IPN_SECRET not configured");
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
    }

    if (!validateIPNSignature(rawBody, signature, ipnSecret)) {
      console.error("NowPayments IPN: Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody) as {
      payment_id: number;
      payment_status: string;
      order_id: string;
    };

    const { payment_status, order_id, payment_id } = payload;

    if (payment_status !== "finished" && payment_status !== "confirmed") {
      return NextResponse.json({ received: true });
    }

    const orderIds = order_id
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
    if (orderIds.length === 0) {
      return NextResponse.json({ received: true });
    }

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const paidAtIso = new Date().toISOString();
    const refStr = String(payment_id);

    for (const oid of orderIds) {
      const { data: ord } = await supabase.from("orders").select("buyer_id").eq("id", oid).single();
      try {
        await finalizeOrderPayment(supabase, oid, {
          providerTransactionId: refStr,
          providerReference: refStr,
          paidAtIso,
          notifyUserId: ord?.buyer_id ?? null,
          nowpaymentsPaymentId: payment_id,
          webhookReference: refStr,
        });
      } catch (e) {
        console.error("NowPayments finalize error", oid, e);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("NowPayments IPN error:", error);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
